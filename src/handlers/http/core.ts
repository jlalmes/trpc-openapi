import { TRPCError } from '@trpc/server';
import {
  NodeHTTPHandlerOptions,
  NodeHTTPRequest,
  NodeHTTPResponse, // eslint-disable-next-line import/no-unresolved
} from '@trpc/server/dist/declarations/src/adapters/node-http';
import { v4 as uuid } from 'uuid';
import { ZodError } from 'zod';

import { generateOpenApiDocument } from '../../generator';
import { OpenApiResponse, OpenApiRouter } from '../../types';
import { removeLeadingTrailingSlash } from '../../utils';
import { getBody } from './body';
import { TRPC_ERROR_CODE_HTTP_STATUS } from './errors';

type Procedure = { type: 'query' | 'mutation'; path: string };

export const getProcedures = (appRouter: OpenApiRouter) => {
  const procedures: Record<string, Record<string, Procedure>> = {};

  const { queries, mutations } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta || {};
    if (!openapi?.enabled) {
      continue;
    }
    const { method } = openapi;
    if (!procedures[method]) {
      procedures[method] = {};
    }
    const path = `/${removeLeadingTrailingSlash(openapi.path)}`;
    procedures[method]![path] = {
      type: 'query',
      path: queryPath,
    };
  }

  for (const mutationPath of Object.keys(mutations)) {
    const query = mutations[mutationPath]!;
    const { openapi } = query.meta || {};
    if (!openapi?.enabled) {
      continue;
    }
    const { method } = openapi;
    if (!procedures[method]) {
      procedures[method] = {};
    }
    const path = `/${removeLeadingTrailingSlash(openapi.path)}`;
    procedures[method]![path] = {
      type: 'mutation',
      path: mutationPath,
    };
  }

  return procedures;
};

export type CreateOpenApiHttpHandlerOptions<
  TRouter extends OpenApiRouter,
  TRequest extends NodeHTTPRequest,
  TResponse extends NodeHTTPResponse,
> = Pick<
  NodeHTTPHandlerOptions<TRouter, TRequest, TResponse>,
  'router' | 'createContext' | 'responseMeta' | 'onError' | 'teardown'
>;

export const createOpenApiHttpHandler = <
  TRouter extends OpenApiRouter,
  TRequest extends NodeHTTPRequest,
  TResponse extends NodeHTTPResponse,
>(
  opts: CreateOpenApiHttpHandlerOptions<TRouter, TRequest, TResponse>,
) => {
  generateOpenApiDocument(opts.router, {
    title: '-',
    description: '-',
    version: '-',
    baseUrl: '-',
  });

  const { router, createContext, responseMeta, onError, teardown } = opts;
  const procedures = getProcedures(router);

  return async (req: TRequest, res: TResponse) => {
    const requestId = uuid();

    const sendResponse = (
      statusCode: number,
      headers: Record<string, string>,
      body: OpenApiResponse,
    ) => {
      res.statusCode = statusCode;
      res.setHeader('X-Request-Id', requestId);
      res.setHeader('Content-Type', 'application/json');
      Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]!));
      res.end(JSON.stringify(body));
    };

    const method = req.method!;
    const url = new URL(req.url!.startsWith('/') ? `http://127.0.0.1${req.url!}` : req.url!);
    const path = `/${removeLeadingTrailingSlash(url.pathname)}`;
    const procedure = procedures[method]?.[path];
    let input: any;
    let ctx: any;
    let data: any;

    try {
      if (!procedure) {
        throw new TRPCError({
          message: 'Not found',
          code: 'NOT_FOUND',
        });
      }

      input = procedure.type === 'query' ? req.query : await getBody(req);
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
      const body = { ok: true as const, data };
      sendResponse(statusCode, headers, body);
    } catch (cause) {
      const error =
        cause instanceof TRPCError
          ? cause
          : new TRPCError({
              message: 'Internal server error',
              code: 'INTERNAL_SERVER_ERROR',
            });

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
        error.code === 'BAD_REQUEST' && error.cause instanceof ZodError;

      const statusCode = meta?.status ?? TRPC_ERROR_CODE_HTTP_STATUS[error.code] ?? 500;
      const headers = meta?.headers ?? {};
      const body = {
        ok: false as const,
        error: {
          message: isInputValidationError ? 'Input validation failed' : error.message,
          code: error.code,
          issues: isInputValidationError ? error.cause.errors : undefined,
        },
      };
      sendResponse(statusCode, headers, body);
    }

    await teardown?.();
  };
};
