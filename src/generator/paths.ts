import { TRPCError } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';

import { OpenApiRouter } from '../types';
import { getInputOutputParsers, getPath } from '../utils';
import { getParameterObjects, getRequestBodyObject, getResponsesObject } from './schema';

export const getOpenApiPathsObject = (
  appRouter: OpenApiRouter,
  pathsObject: OpenAPIV3.PathsObject,
): OpenAPIV3.PathsObject => {
  const { queries, mutations, subscriptions } = appRouter._def;

  for (const queryPath of Object.keys(queries)) {
    try {
      const query = queries[queryPath]!;
      const { openapi } = query.meta || {};
      if (!openapi?.enabled) {
        continue;
      }

      const { method, summary, tags, protect } = openapi;
      if (method !== 'GET' && method !== 'DELETE') {
        throw new TRPCError({
          message: 'Query method must be GET or DELETE',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const { path, pathParameters } = getPath(openapi.path);
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
      const { openapi } = mutation.meta || {};
      if (!openapi?.enabled) {
        continue;
      }

      const { method, summary, tags, protect } = openapi;
      if (method !== 'POST' && method !== 'PATCH' && method !== 'PUT') {
        throw new TRPCError({
          message: 'Mutation method must be POST, PATCH or PUT',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const { path, pathParameters } = getPath(openapi.path);
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
      const { openapi } = subscription.meta || {};
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
