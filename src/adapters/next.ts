import { TRPCError } from '@trpc/server';
import { NextApiRequest, NextApiResponse } from 'next';

import { OpenApiErrorResponse, OpenApiRouter } from '../types';
import { removeLeadingTrailingSlash } from '../utils';
import { CreateOpenApiHttpHandlerOptions, createOpenApiHttpHandler } from './node-http/core';

export type CreateOpenApiNextHandlerOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiHttpHandlerOptions<TRouter, NextApiRequest, NextApiResponse>;

export const createOpenApiNextHandler = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiNextHandlerOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiHttpHandler(opts);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    let path: string | null = null;
    if (typeof req.query.trpc === 'string') {
      path = req.query.trpc;
    } else if (Array.isArray(req.query.trpc)) {
      path = req.query.trpc.join('/');
    }

    if (path === null) {
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
      return;
    }

    req.url = `/${removeLeadingTrailingSlash(path)}`;
    return openApiHttpHandler(req, res);
  };
};
