import { TRPCError } from '@trpc/server';
import type { NodeIncomingMessage, NodeServerResponse } from 'h3';
import { defineEventHandler, getQuery } from 'h3';
import { IncomingMessage } from 'http';

import { OpenApiErrorResponse, OpenApiRouter } from '../types';
import { normalizePath } from '../utils/path';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from './node-http/core';

export type CreateOpenApiNuxtHandlerOptions<TRouter extends OpenApiRouter> = Omit<
  CreateOpenApiNodeHttpHandlerOptions<TRouter, NodeIncomingMessage, NodeServerResponse>,
  'maxBodySize'
>;

type NuxtRequest = IncomingMessage & {
  query?: ReturnType<typeof getQuery>;
};

export const createOpenApiNuxtHandler = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiNuxtHandlerOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);

  return defineEventHandler(async (event) => {
    let pathname: string | null = null;

    const params = event.context.params;
    if (params && params?.trpc) {
      if (!params.trpc.includes('/')) {
        pathname = params.trpc;
      } else {
        pathname = params.trpc;
      }
    }

    if (pathname === null) {
      const error = new TRPCError({
        message: 'Query "trpc" not found - is the `trpc-openapi` file named `[...trpc].ts`?',
        code: 'INTERNAL_SERVER_ERROR',
      });

      opts.onError?.({
        error,
        type: 'unknown',
        path: undefined,
        input: undefined,
        ctx: undefined,
        req: event.node.req,
      });

      event.node.res.statusCode = 500;
      event.node.res.setHeader('Content-Type', 'application/json');
      const body: OpenApiErrorResponse = {
        message: error.message,
        code: error.code,
      };
      event.node.res.end(JSON.stringify(body));

      return;
    }

    (event.node.req as NuxtRequest).query = getQuery(event);
    event.node.req.url = normalizePath(pathname);
    await openApiHttpHandler(event.node.req, event.node.res);
  });
};
