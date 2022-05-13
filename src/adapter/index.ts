import http from 'http';

import { generateOpenApiDocument } from '../generator';
import { OpenApiMethod, OpenApiRouter } from '../types';

type Procedure = { type: 'query' | 'mutation'; path: string };

const getRoutes = (appRouter: OpenApiRouter) => {
  const map: Record<string, Record<string, Procedure>> = {};
  const { queries, mutations } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta || {};
    if (!openapi?.enabled) {
      continue;
    }
    const { path, method } = openapi;
    if (!map[method]) {
      map[method] = {};
    }
    map[method]![path] = {
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
    if (!map[method]) {
      map[method] = {};
    }
    map[method]![path] = {
      type: 'mutation',
      path: mutationPath,
    };
  }

  return map;
};

export const createOpenApiHttpHandler = (appRouter: OpenApiRouter) => {
  generateOpenApiDocument(appRouter, { title: '-', version: '-', baseUrl: '-' }); // validate appRouter
  const routes = getRoutes(appRouter);

  // return async (req: http.IncomingMessage, res: http.ServerResponse) => {
  //   const url = new URL(req.url!.startsWith('/') ? `http://127.0.0.1${req.url!}` : req.url!);
  //   const method = req.method as string;
  //   const path = url.pathname;

  //   if ()
  // };
};
