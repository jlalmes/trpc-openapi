import { Request, Response } from 'express';

import { OpenApiRouter } from '../types';
import { CreateOpenApiHttpHandlerOptions, createOpenApiHttpHandler } from './node-http/core';

export type CreateOpenApiExpressMiddlewareOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiHttpHandlerOptions<TRouter, Request, Response>;

export const createOpenApiExpressMiddleware = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiExpressMiddlewareOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiHttpHandler(opts);
  return async (req: Request, res: Response) => {
    return openApiHttpHandler(req, res);
  };
};
