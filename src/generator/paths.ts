import { TRPCError } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';

import { OpenApiProcedureRecord, OpenApiRouter } from '../types';
import { acceptsRequestBody } from '../utils/method';
import { getPathParameters, normalizePath } from '../utils/path';
import { forEachOpenApiProcedure, getInputOutputParsers } from '../utils/procedure';
import { getParameterObjects, getRequestBodyObject, getResponsesObject } from './schema';

export const getOpenApiPathsObject = (
  appRouter: OpenApiRouter,
  pathsObject: OpenAPIV3.PathsObject,
): OpenAPIV3.PathsObject => {
  const procedures = appRouter._def.procedures as OpenApiProcedureRecord;

  forEachOpenApiProcedure(procedures, ({ path: procedurePath, type, procedure, openapi }) => {
    const operationId = `${type}.${procedurePath}`;

    try {
      if (type === 'subscription') {
        throw new TRPCError({
          message: 'Subscriptions are not supported by OpenAPI v3',
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const { method, protect, summary, description, tags, headers } = openapi;

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

      const contentTypes = openapi.contentTypes || ['application/json'];
      if (contentTypes.length === 0) {
        throw new TRPCError({
          message: 'At least one content type must be specified',
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
          tags: tags,
          security: protect ? [{ Authorization: [] }] : undefined,
          ...(acceptsRequestBody(method)
            ? {
                requestBody: getRequestBodyObject(inputParser, pathParameters, contentTypes),
                parameters: [
                  ...headerParameters,
                  ...(getParameterObjects(inputParser, pathParameters, 'path') || []),
                ],
              }
            : {
                requestBody: undefined,
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
