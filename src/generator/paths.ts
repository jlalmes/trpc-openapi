import { TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { Procedure } from '@trpc/server/dist/declarations/src/internals/procedure';
import { OpenAPIV3 } from 'openapi-types';

import { OpenApiRouter } from '../types';
import { getPathParameters, normalizePath } from '../utils';
import { getParameterObjects, getRequestBodyObject, getResponsesObject } from './schema';

// `inputParser` & `outputParser` are private so this is a hack to access it
export const getInputOutputParsers = (procedure: Procedure<any, any, any, any, any, any, any>) => {
  return procedure as unknown as {
    inputParser: typeof procedure['inputParser'];
    outputParser: typeof procedure['outputParser'];
  };
};

export const getOpenApiPathsObject = (
  appRouter: OpenApiRouter,
  pathsObject: OpenAPIV3.PathsObject,
): OpenAPIV3.PathsObject => {
  const { queries, mutations, subscriptions } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    try {
      const query = queries[queryPath]!;
      const { openapi } = query.meta ?? {};
      if (!openapi?.enabled) {
        continue;
      }

      const { method, protect, summary, description, tags } = openapi;
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

      const { inputParser, outputParser } = getInputOutputParsers(query);

      pathsObject[path] = {
        ...pathsObject[path],
        [httpMethod]: {
          summary,
          description,
          tags,
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
  }

  for (const mutationPath of Object.keys(mutations)) {
    try {
      const mutation = mutations[mutationPath]!;
      const { openapi } = mutation.meta ?? {};
      if (!openapi?.enabled) {
        continue;
      }

      const { method, protect, summary, description, tags } = openapi;
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

      const { inputParser, outputParser } = getInputOutputParsers(mutation);

      pathsObject[path] = {
        ...pathsObject[path],
        [httpMethod]: {
          summary,
          description,
          tags,
          security: protect ? [{ Authorization: [] }] : undefined,
          requestBody: getRequestBodyObject(inputParser),
          parameters: getParameterObjects(inputParser, pathParameters, 'path'),
          responses: getResponsesObject(outputParser),
        },
      };
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[mutation.${mutationPath}] - ${error.message}`;
      throw error;
    }
  }

  for (const subscriptionPath of Object.keys(subscriptions)) {
    try {
      const subscription = subscriptions[subscriptionPath]!;
      const { openapi } = subscription.meta ?? {};
      if (!openapi?.enabled) {
        continue;
      }

      throw new TRPCError({
        message: 'Subscriptions are not supported by OpenAPI v3',
        code: 'INTERNAL_SERVER_ERROR',
      });
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[subscription.${subscriptionPath}] - ${error.message}`;
      throw error;
    }
  }

  return pathsObject;
};
