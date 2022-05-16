import { TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { NodeHTTPHandlerOptions } from '@trpc/server/dist/declarations/src/adapters/node-http';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { ZodError } from 'zod';

import { OpenApiRouter } from '../types';
import { removeLeadingTrailingSlash } from '../utils';
import { getProcedures } from './http/core';
import { TRPC_ERROR_CODE_HTTP_STATUS } from './http/errors';

export type CreateOpenApiExpressHandlerOptions<TRouter extends OpenApiRouter> = Pick<
  NodeHTTPHandlerOptions<TRouter, Request, Response>,
  'router' | 'createContext' | 'responseMeta' | 'onError' | 'teardown'
>;

export const createOpenApiExpressHandler = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiExpressHandlerOptions<TRouter>,
) => {
  const { router, createContext, responseMeta, onError, teardown } = opts;
  const procedures = getProcedures(router);

  return async (req: Request, res: Response) => {
    const requestId = uuid();
    res.setHeader('X-Request-Id', requestId);

    const method = req.method;
    const url = new URL(req.url.startsWith('/') ? `http://127.0.0.1${req.url}` : req.url);
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

      input = procedure.type === 'query' ? req.query : req.body;
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
      for (const key of Object.keys(headers)) {
        const value = headers[key];
        if (value) {
          res.setHeader(key, value);
        }
      }

      res.setHeader('Content-Type', 'application/json');
      res.status(statusCode).send({
        ok: true,
        data,
      });
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
      const statusCode = meta?.status ?? TRPC_ERROR_CODE_HTTP_STATUS[error.code] ?? 500;
      const headers = meta?.headers ?? {};
      for (const key of Object.keys(headers)) {
        const value = headers[key];
        if (value) {
          res.setHeader(key, value);
        }
      }

      const isInputValidationError =
        error.code === 'BAD_REQUEST' && error.cause instanceof ZodError;

      res.setHeader('Content-Type', 'application/json');
      res.status(statusCode).send({
        ok: false,
        error: {
          message: isInputValidationError ? 'Input validation failed' : error.message,
          code: error.code,
          issues: isInputValidationError ? error.cause.errors : undefined,
        },
      });
    }
    await teardown?.();
  };
};
