import { OpenApiRouter } from '../../types';
import { getPathRegExp, normalizePath } from '../../utils';

type Procedure = { type: 'query' | 'mutation'; path: string };

const getMethodPathProcedureMap = (appRouter: OpenApiRouter) => {
  const map = new Map<string, Map<RegExp, Procedure>>();

  const { queries, mutations } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }
    const { method } = openapi;
    if (!map.has(method)) {
      map.set(method, new Map());
    }
    const path = normalizePath(openapi.path);
    const pathRegExp = getPathRegExp(path);
    map.get(method)!.set(pathRegExp, {
      type: 'query',
      path: queryPath,
    });
  }

  for (const mutationPath of Object.keys(mutations)) {
    const mutation = mutations[mutationPath]!;
    const { openapi } = mutation.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }
    const { method } = openapi;
    if (!map.has(method)) {
      map.set(method, new Map());
    }
    const path = normalizePath(openapi.path);
    const pathRegExp = getPathRegExp(path);
    map.get(method)!.set(pathRegExp, {
      type: 'mutation',
      path: mutationPath,
    });
  }

  return map;
};

export const createMatchProcedureFn = (router: OpenApiRouter) => {
  const methodPathProcedureMap = getMethodPathProcedureMap(router);

  return (method: string, path: string) => {
    const pathProcedureMap = methodPathProcedureMap.get(method);
    if (!pathProcedureMap) {
      return undefined;
    }

    const matchingRegExp = Array.from(pathProcedureMap.keys()).find((regExp) => {
      return regExp.test(path);
    });
    if (!matchingRegExp) {
      return undefined;
    }

    const procedure = pathProcedureMap.get(matchingRegExp)!;
    const pathInput = matchingRegExp.exec(path)?.groups;

    return { procedure, pathInput };
  };
};
