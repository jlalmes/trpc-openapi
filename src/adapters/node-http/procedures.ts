import { OpenApiRouter } from '../../types';
import { getPath } from '../../utils';

type Procedure = { type: 'query' | 'mutation'; path: string };

export const getProcedures = (appRouter: OpenApiRouter) => {
  const procedures: Record<string, Record<string, Procedure>> = {};

  const { queries, mutations } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta || {};
    if (!openapi?.enabled) {
      continue;
    }
    const { method } = openapi;
    if (!procedures[method]) {
      procedures[method] = {};
    }
    const { path } = getPath(openapi.path);
    procedures[method]![path] = {
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
    const { method } = openapi;
    if (!procedures[method]) {
      procedures[method] = {};
    }
    const { path } = getPath(openapi.path);
    procedures[method]![path] = {
      type: 'mutation',
      path: mutationPath,
    };
  }

  return procedures;
};
