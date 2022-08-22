import { TRPCError } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';

import { OpenApiRouter } from '../types';
import { getPathParameters, normalizePath } from '../utils/path';
import {
  forEachOpenApiProcedure,
  getInputOutputParsers,
  mergeProcedureRecords,
} from '../utils/procedure';
import { getParameterObjects, getRequestBodyObject, getResponsesObject } from './schema';

const acceptsRequestBody = (httpMethod: OpenAPIV3.HttpMethods) => {
  if (httpMethod === 'get' || httpMethod === 'delete') {
    return false;
  }
  return true;
};

export const getOpenApiPathsObject = (
  appRouter: OpenApiRouter,
  pathsObject: OpenAPIV3.PathsObject,
): OpenAPIV3.PathsObject => {
  const { queries, mutations, subscriptions } = appRouter._def;

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

  const procedures = mergeProcedureRecords(queries, mutations);

  forEachOpenApiProcedure(procedures, ({ path: operationId, procedure, openapi }) => {
    try {
      const { method, protect, summary, description, tags, tag, headers } = openapi;

      const path = normalizePath(openapi.path);
      const pathParameters = getPathParameters(path);
      const headerParameters = headers?.map((header) => ({ ...header, in: 'header' })) || [];
      const httpMethod = OpenAPIV3.HttpMethods[method];
      if (!httpMethod) {
        throw new TRPCError({
          message: 'Method must be GET, POST, PATCH, PUT or DELETE',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }
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
          operationId,
          summary,
          description,
          tags: tags ?? (tag ? [tag] : undefined),
          security: protect ? [{ Authorization: [] }] : undefined,
          ...(acceptsRequestBody(httpMethod)
            ? {
                requestBody: getRequestBodyObject(inputParser, pathParameters),
                parameters: [
                  ...headerParameters,
                  ...(getParameterObjects(inputParser, pathParameters, 'path') || []),
                ],
              }
            : {
                parameters: [
                  ...headerParameters,
                  ...(getParameterObjects(inputParser, pathParameters, 'all') || []),
                ],
              }),
          responses: getResponsesObject(outputParser),
        },
      };
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      error.message = `[${operationId}] - ${error.message}`;
      throw error;
    }
  });

  return pathsObject;
};
