import { OpenApiMethod, OpenApiProcedure, OpenApiRouter } from '../../types';
import { getPathRegExp, normalizePath } from '../../utils/path';
import { forEachOpenApiProcedure } from '../../utils/procedure';

type RouterProcedure = {
  type: 'query' | 'mutation';
  path: string;
  procedure: OpenApiProcedure;
};

const getMethodRegExpProcedureMap = (appRouter: OpenApiRouter) => {
  const map = new Map<OpenApiMethod, Map<RegExp, RouterProcedure>>();

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
      procedure,
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
      procedure,
    });
  });

  return map;
};

export const createGetRouterProcedure = (router: OpenApiRouter) => {
  const methodRegExpProcedureMap = getMethodRegExpProcedureMap(router);

  return (method: OpenApiMethod, path: string) => {
    const regExpProcedureMap = methodRegExpProcedureMap.get(method);
    if (!regExpProcedureMap) {
      return undefined;
    }

    const regExp = Array.from(regExpProcedureMap.keys()).find((re) => re.test(path));
    if (!regExp) {
      return undefined;
    }

    const procedure = regExpProcedureMap.get(regExp)!;
    const pathInput = regExp.exec(path)?.groups ?? {};

    return { procedure, pathInput };
  };
};
