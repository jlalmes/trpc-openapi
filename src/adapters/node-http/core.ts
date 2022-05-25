import { TRPCError } from '@trpc/server';
import {
  NodeHTTPHandlerOptions,
  NodeHTTPRequest,
  NodeHTTPResponse, // eslint-disable-next-line import/no-unresolved
} from '@trpc/server/dist/declarations/src/adapters/node-http';
import { ZodError } from 'zod';

import { generateOpenApiDocument } from '../../generator';
import {
  OpenApiErrorResponse,
  OpenApiResponse,
  OpenApiRouter,
  OpenApiSuccessResponse,
} from '../../types';
import { removeLeadingTrailingSlash } from '../../utils';
import { TRPC_ERROR_CODE_HTTP_STATUS, getErrorFromUnknown } from './errors';
import { getBody, getQuery } from './input';
import { getProcedures } from './procedures';

export type CreateOpenApiNodeHttpHandlerOptions<
  TRouter extends OpenApiRouter,
  TRequest extends NodeHTTPRequest,
  TResponse extends NodeHTTPResponse,
> = Pick<
  NodeHTTPHandlerOptions<TRouter, TRequest, TResponse>,
  'router' | 'createContext' | 'responseMeta' | 'onError' | 'teardown' | 'maxBodySize'
>;

export type OpenApiNextFunction = () => void;

export const createOpenApiNodeHttpHandler = <
  TRouter extends OpenApiRouter,
  TRequest extends NodeHTTPRequest,
  TResponse extends NodeHTTPResponse,
>(
  opts: CreateOpenApiNodeHttpHandlerOptions<TRouter, TRequest, TResponse>,
) => {
  // validate router
  generateOpenApiDocument(opts.router, {
    title: '-',
    description: '-',
    version: '-',
    baseUrl: '-',
  });

  const { router, createContext, responseMeta, onError, teardown, maxBodySize } = opts;
  const procedures = getProcedures(router);

  return async (req: TRequest, res: TResponse, next?: OpenApiNextFunction) => {
    const sendResponse = (
      statusCode: number,
      headers: Record<string, string>,
      body: OpenApiResponse | undefined,
    ) => {
      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');
      for (const [key, value] of Object.entries(headers)) {
        if (typeof value !== 'undefined') {
          res.setHeader(key, value);
        }
      }
      res.end(JSON.stringify(body));
    };

    const method = req.method!;
    const reqUrl = req.url!;
    const url = new URL(reqUrl.startsWith('/') ? `http://127.0.0.1${reqUrl}` : reqUrl);
    const path = `/${removeLeadingTrailingSlash(url.pathname)}`;
    const procedure = procedures[method]?.[path];
    let input: any;
    let ctx: any;
    let data: any;

    try {
      if (!procedure) {
        if (next) {
          return next();
        }

        // Can be used for warmup
        if (method === 'HEAD') {
          sendResponse(204, {}, undefined);
          return await teardown?.();
        }

        throw new TRPCError({
          message: 'Not found',
          code: 'NOT_FOUND',
        });
      }

      input = procedure.type === 'query' ? getQuery(req, url) : await getBody(req, maxBodySize);
      ctx = await createContext?.({ ...opts, req, res });
      const caller = router.createCaller(ctx);
      data = await caller[procedure.type](procedure.path, input);

      const meta = responseMeta?.({
        type: procedure.type,
        paths: [procedure.path],
        ctx,
        data: [data],
        errors: [],
      });

      const statusCode = meta?.status ?? 200;
      const headers = meta?.headers ?? {};
      const body: OpenApiSuccessResponse = {
        ok: true as const,
        data,
      };
      sendResponse(statusCode, headers, body);
    } catch (cause) {
      const error = getErrorFromUnknown(cause);

      onError?.({
        error,
        type: procedure?.type ?? 'unknown',
        path: procedure?.path,
        input,
        ctx,
        req,
      });

      const meta = responseMeta?.({
        type: procedure?.type ?? 'unknown',
        paths: procedure?.path ? [procedure?.path] : undefined,
        ctx,
        data: [data],
        errors: [error],
      });

      const isInputValidationError =
        error.code === 'BAD_REQUEST' &&
        error.cause instanceof Error &&
        error.cause.name === 'ZodError';

      const statusCode = meta?.status ?? TRPC_ERROR_CODE_HTTP_STATUS[error.code] ?? 500;
      const headers = meta?.headers ?? {};
      const body: OpenApiErrorResponse = {
        ok: false,
        error: {
          message: isInputValidationError ? 'Input validation failed' : error.message,
          code: error.code,
          issues: isInputValidationError ? (error.cause as ZodError).errors : undefined,
        },
      };
      sendResponse(statusCode, headers, body);
    }

    await teardown?.();
  };
};
