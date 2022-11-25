import { Request, Response } from 'express';
import { NodeIncomingMessage, NodeServerResponse, defineEventHandler } from 'h3';

import { OpenApiRouter } from '../types';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from './node-http/core';

export type CreateOpenApiNuxtMiddlewareOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiNodeHttpHandlerOptions<TRouter, NodeIncomingMessage, NodeServerResponse>;

export const createOpenApiNuxtMiddleware = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiNuxtMiddlewareOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);

  return defineEventHandler(async (event) => {
    await openApiHttpHandler(event.node.req, event.node.res);
  });

  return async (req: Request, res: Response) => {
    await openApiHttpHandler(req, res);
  };
};
