import { AnyRouter, router } from '@trpc/server';
import { NodeHTTPHandlerOptions } from '@trpc/server/dist/declarations/src/adapters/node-http';
import { IncomingMessage, ServerResponse } from 'http';

import { generateOpenAPISchema } from './generator';

export const createOpenAPIHandler = (
  opts: NodeHTTPHandlerOptions<AnyRouter, IncomingMessage, ServerResponse>,
) => {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url!.startsWith('/') ? `http://127.0.0.1${req.url}` : req.url!;
    const path = new URL(url).pathname;
    const body = {};
    const query = {};
  };
};
