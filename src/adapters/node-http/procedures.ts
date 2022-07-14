import { OpenApiRouter } from '../../types';
import { getPathRegExp, normalizePath } from '../../utils/path';
import { forEachOpenApiProcedure } from '../../utils/procedure';

type Procedure = { type: 'query' | 'mutation'; path: string };

const getMethodPathProcedureMap = (appRouter: OpenApiRouter) => {
  const map = new Map<string, Map<RegExp, Procedure>>();

  const { queries, mutations } = appRouter._def;

  forEachOpenApiProcedure(queries, ({ path: queryPath, procedure, openapi }) => {
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
  });

  forEachOpenApiProcedure(mutations, ({ path: mutationPath, procedure, openapi }) => {
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
  });

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
    const pathInput = matchingRegExp.exec(path)?.groups ?? {};

    return { procedure, pathInput };
  };
};
