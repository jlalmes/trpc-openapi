import { OpenAPIV3 } from 'openapi-types';

import {
  getReponseBodySchema,
  getRequestBodySchema,
  getRequestQueryParametersSchema,
} from './schema';
import { OpenAPIMethod, OpenAPIProcedure, OpenAPIRouter } from './types';

export const openAPIVersion = '3.0.3' as const;

const getPathname = (procedure: string) => {
  return `/${procedure.toLowerCase().split('.').join('/')}`;
};

const getParsers = (procedure: OpenAPIProcedure) => {
  return procedure as unknown as {
    inputParser: typeof procedure['inputParser'];
    outputParser: typeof procedure['outputParser'];
  };
};

export const getOpenAPIProcedures = () => {
  const procedures: Record<OpenAPIMethod, Record<string, string>> = {};
  for 
};

export type GenerateOpenAPISchemaOptions = {
  title: string;
  version: string;
  description?: string;
  baseUrl: string;
  docsUrl?: string;
};

export const generateOpenAPISchema = (
  router: OpenAPIRouter,
  opts: GenerateOpenAPISchemaOptions,
): OpenAPIV3.Document => {
  const getPathsObject = (router: OpenAPIRouter): OpenAPIV3.PathsObject => {
    const { queries, mutations } = router._def;

    const pathsObject: OpenAPIV3.PathsObject = {};

    for (const procedure in queries) {
      try {
        const query = queries[procedure]!;
        const { openapi } = query.meta || {};
        if (openapi?.enabled) {
          const pathname = getPathname(procedure);
          const method = openapi.method || 'GET';
          if (method !== 'GET' && method !== 'DELETE') {
            throw new Error('Query procedures can only use GET or DELETE methods');
          }
          const { tags, description, isProtected } = openapi;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { inputParser, outputParser } = getParsers(query);

          const HTTPMethod = OpenAPIV3.HttpMethods[method];
          if (pathsObject[pathname]?.[HTTPMethod]) {
            throw new Error(`Duplicate procedure definition for route ${method} ${pathname}`);
          }

          pathsObject[pathname] = {
            ...pathsObject[pathname],
            [HTTPMethod]: {
              tags,
              description,
              ...(isProtected && {
                security: [
                  {
                    Authorization: [],
                  },
                ],
              }),
              parameters: getRequestQueryParametersSchema(inputParser),
              responses: getReponseBodySchema(outputParser),
            },
          };
        }
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        error.message = `[queries.${procedure}] - ${error.message}`;
        throw error;
      }
    }

    for (const procedure in mutations) {
      try {
        const query = mutations[procedure]!;
        const { openapi } = query.meta || {};
        if (openapi?.enabled) {
          const pathname = getPathname(procedure);
          const method = openapi.method || 'POST';
          if (method !== 'POST' && method !== 'PATCH' && method !== 'PUT') {
            throw new Error('Mutation procedures can only use POST, PATCH or PUT methods');
          }
          const { tags, description, isProtected } = openapi;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const { inputParser, outputParser } = getParsers(query);

          const HTTPMethod = OpenAPIV3.HttpMethods[method];
          if (pathsObject[pathname]?.[HTTPMethod]) {
            throw new Error(`Duplicate procedure definition for route ${method} ${pathname}`);
          }

          pathsObject[pathname] = {
            ...pathsObject[pathname],
            [HTTPMethod]: {
              tags,
              description,
              ...(isProtected && {
                security: [
                  {
                    Authorization: [],
                  },
                ],
              }),
              requestBody: getRequestBodySchema(inputParser),
              responses: getReponseBodySchema(outputParser),
            },
          };
        }
      } catch (error: any) {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        error.message = `[mutations.${procedure}] - ${error.message}`;
        throw error;
      }
    }

    return pathsObject;
  };

  return {
    openapi: openAPIVersion,
    info: {
      title: opts.title,
      description: opts.description,
      version: opts.version,
    },
    servers: [
      {
        url: opts.baseUrl,
      },
    ],
    paths: getPathsObject(router),
    components: {
      securitySchemes: {
        Authorization: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    },
    externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
  };
};
