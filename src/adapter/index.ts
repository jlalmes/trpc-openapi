// eslint-disable-next-line import/no-unresolved
import { NodeHTTPHandlerOptions } from '@trpc/server/dist/declarations/src/adapters/node-http';
import http from 'http';

import { generateOpenApiDocument } from '../generator';
import { OpenApiMethod, OpenApiRouter } from '../types';
import { removeLeadingTrailingSlash } from '../utils';

type ProcedureRef = { type: 'query' | 'mutation'; path: string };

const getOpenApiProcedures = (appRouter: OpenApiRouter) => {
  const procedures: Record<string, Record<string, ProcedureRef>> = {};

  const { queries, mutations } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta || {};
    if (!openapi?.enabled) {
      continue;
    }
    const { path, method } = openapi;
    if (!procedures[method]) {
      procedures[method] = {};
    }
    procedures[method]![removeLeadingTrailingSlash(path)] = {
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
    const { path, method } = openapi;
    if (!procedures[method]) {
      procedures[method] = {};
    }
    procedures[method]![removeLeadingTrailingSlash(path)] = {
      type: 'mutation',
      path: mutationPath,
    };
  }

  return procedures;
};

export type CreateOpenApiHttpHandlerOptions<TRouter extends OpenApiRouter> = Omit<
  NodeHTTPHandlerOptions<TRouter, http.IncomingMessage, http.ServerResponse>,
  'batching'
>;

export const createOpenApiHttpHandler = <TRouter extends OpenApiRouter>(
  opts: CreateOpenApiHttpHandlerOptions<TRouter>,
) => {
  const { router, createContext, maxBodySize, onError, responseMeta, teardown } = opts;
  generateOpenApiDocument(router, { title: '-', version: '-', baseUrl: '-' }); // validate appRouter
  const openApiProcedures = getOpenApiProcedures(router);

  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    // if no hostname, set a dummy one
    const url = new URL(req.url!.startsWith('/') ? `http://127.0.0.1${req.url!}` : req.url!);
    const path = removeLeadingTrailingSlash(url.pathname);
    const method = req.method as OpenApiMethod;
    const procedure = openApiProcedures[method]?.[path];
    if (procedure) {
    }
    // const method = req.method as string;
    // const path = url.pathname;
    // const route = routes[method]?.[path];
    // if (route) {
    //   const caller = appRouter.createCaller({});
    //   let input: any;
    //   if (route.type === 'query') {
    //     input = {}; // req.query
    //   } else {
    //     input = {}; // req.body
    //   }
    //   const result = await caller[route.type](route.path, input);
    //   const response = result;
    // }
  };
};
