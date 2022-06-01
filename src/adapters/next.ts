import { TRPCError } from '@trpc/server';
import { NextApiRequest, NextApiResponse } from 'next';

import { OpenApiErrorResponse, OpenApiRouter } from '../types';
import { getPath } from '../utils';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from './node-http/core';

export type CreateOpenApiNextHandlerOptions<TRouter extends OpenApiRouter> = Omit<
  CreateOpenApiNodeHttpHandlerOptions<TRouter, NextApiRequest, NextApiResponse>,
  'maxBodySize'
>;

export const createOpenApiNextHandler = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiNextHandlerOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    let pathname: string | null = null;
    if (typeof req.query.trpc === 'string') {
      pathname = req.query.trpc;
    } else if (Array.isArray(req.query.trpc)) {
      pathname = req.query.trpc.join('/');
    }

    if (pathname === null) {
      const error = new TRPCError({
        message: 'Query "trpc" not found - is the file named `[trpc]`.ts or `[...trpc].ts`?',
        code: 'INTERNAL_SERVER_ERROR',
      });

      opts.onError?.({
        error,
        type: 'unknown',
        path: undefined,
        input: undefined,
        ctx: undefined,
        req,
      });

      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      const body: OpenApiErrorResponse = {
        ok: false,
        error: { message: error.message, code: error.code },
      };
      res.end(JSON.stringify(body));

      await opts.teardown?.();

      return;
    }

    const { path } = getPath(pathname);
    req.url = path;
    return openApiHttpHandler(req, res);
  };
};
