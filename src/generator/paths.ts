import { TRPCError } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';

import { OpenApiRouter } from '../types';
import { getPathParameters, normalizePath } from '../utils/path';
import { forEachOpenApiProcedure, getInputOutputParsers } from '../utils/procedure';
import { getParameterObjects, getRequestBodyObject, getResponsesObject } from './schema';

export const getOpenApiPathsObject = (
  appRouter: OpenApiRouter,
  pathsObject: OpenAPIV3.PathsObject,
): OpenAPIV3.PathsObject => {
  const { queries, mutations, subscriptions } = appRouter._def;

  forEachOpenApiProcedure(queries, ({ path: queryPath, procedure, openapi }) => {
    try {
      const { method, protect, summary, description, tag } = openapi;
      if (method !== 'GET' && method !== 'DELETE') {
        throw new TRPCError({
          message: 'Query method must be GET or DELETE',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const path = normalizePath(openapi.path);
      const pathParameters = getPathParameters(path);
      const httpMethod = OpenAPIV3.HttpMethods[method];
      if (pathsObject[path]?.[httpMethod]) {
        throw new TRPCError({
          message: `Duplicate procedure defined for route ${method} ${path}`,
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const { inputParser, outputParser } = getInputOutputParsers(procedure);

      pathsObject[path] = {
        ...pathsObject[path],
        [httpMethod]: {
          summary,
          description,
          tags: tag ? [tag] : undefined,
          security: protect ? [{ Authorization: [] }] : undefined,
          parameters: getParameterObjects(inputParser, pathParameters, 'all'),
          responses: getResponsesObject(outputParser),
        },
      };
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[query.${queryPath}] - ${error.message}`;
      throw error;
    }
  });

  forEachOpenApiProcedure(mutations, ({ path: mutationPath, procedure, openapi }) => {
    try {
      const { method, protect, summary, description, tag } = openapi;
      if (method !== 'POST' && method !== 'PATCH' && method !== 'PUT') {
        throw new TRPCError({
          message: 'Mutation method must be POST, PATCH or PUT',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const path = normalizePath(openapi.path);
      const pathParameters = getPathParameters(path);
      const httpMethod = OpenAPIV3.HttpMethods[method];
      if (pathsObject[path]?.[httpMethod]) {
        throw new TRPCError({
          message: `Duplicate procedure defined for route ${method} ${path}`,
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const { inputParser, outputParser } = getInputOutputParsers(procedure);

      pathsObject[path] = {
        ...pathsObject[path],
        [httpMethod]: {
          summary,
          description,
          tags: tag ? [tag] : undefined,
          security: protect ? [{ Authorization: [] }] : undefined,
          requestBody: getRequestBodyObject(inputParser, pathParameters),
          parameters: getParameterObjects(inputParser, pathParameters, 'path'),
          responses: getResponsesObject(outputParser),
        },
      };
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[mutation.${mutationPath}] - ${error.message}`;
      throw error;
    }
  });

  forEachOpenApiProcedure(subscriptions, ({ path: subscriptionPath }) => {
    try {
      throw new TRPCError({
        message: 'Subscriptions are not supported by OpenAPI v3',
        code: 'INTERNAL_SERVER_ERROR',
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[subscription.${subscriptionPath}] - ${error.message}`;
      throw error;
    }
  });

  return pathsObject;
};
