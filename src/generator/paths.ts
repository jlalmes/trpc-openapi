import { OpenAPIV3 } from 'openapi-types';

import { OpenApiRouter } from '../types';
import { getInputOutputParsers } from '../utils';
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

      const { path, method, description, tags, secure } = openapi;
      if (method !== 'GET' && method !== 'DELETE') {
        throw new Error('Query method must be GET or DELETE');
      }

      const httpMethod = OpenAPIV3.HttpMethods[method];
      if (pathsObject[path]?.[httpMethod]) {
        throw new Error(`Duplicate procedure defined for route ${method} ${path}`);
      }

      const { inputParser, outputParser } = getInputOutputParsers(query);

      pathsObject[path] = {
        ...pathsObject[path],
        [httpMethod]: {
          description,
          tags,
          security: secure ? [{ Authorization: [] }] : undefined,
          parameters: getParameterObjects(inputParser),
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

      const { path, method, description, tags, secure } = openapi;
      if (method !== 'POST' && method !== 'PATCH' && method !== 'PUT') {
        throw new Error('Mutation method must be POST, PATCH or PUT');
      }

      const httpMethod = OpenAPIV3.HttpMethods[method];
      if (pathsObject[path]?.[httpMethod]) {
        throw new Error(`Duplicate procedure defined for route ${method} ${path}`);
      }

      const { inputParser, outputParser } = getInputOutputParsers(mutation);

      pathsObject[path] = {
        ...pathsObject[path],
        [httpMethod]: {
          description,
          tags,
          security: secure ? [{ Authorization: [] }] : undefined,
          requestBody: getRequestBodyObject(inputParser),
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
      throw new Error('Subscriptions are not supported by OpenAPI v3');
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[subscription.${subscriptionPath}] - ${error.message}`;
      throw error;
    }
  }

  return pathsObject;
};
