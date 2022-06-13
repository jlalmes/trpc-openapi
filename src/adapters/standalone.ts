import { IncomingMessage, ServerResponse } from 'http';

import { OpenApiRouter } from '../types';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from './node-http/core';

export type CreateOpenApiHttpHandlerOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiNodeHttpHandlerOptions<TRouter, IncomingMessage, ServerResponse>;

export const createOpenApiHttpHandler = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiHttpHandlerOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);
  return async (req: IncomingMessage, res: ServerResponse) => {
    await openApiHttpHandler(req, res);
  };
};
