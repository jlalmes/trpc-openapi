import { OpenAPIV3 } from 'openapi-types';

import { OpenApiRouter } from '../types';
import { getOpenApiPathsObject } from './paths';
import { errorResponseObject } from './schema';

export const openApiVersion = '3.0.3' as const;

export type GenerateOpenApiDocumentOptions = {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
};

export const generateOpenApiDocument = (
  appRouter: OpenApiRouter,
  opts: GenerateOpenApiDocumentOptions,
): OpenAPIV3.Document => {
  return {
    openapi: openApiVersion,
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
    paths: getOpenApiPathsObject(appRouter, {}),
    components: {
      securitySchemes: {
        Authorization: {
          type: 'http',
          scheme: 'bearer',
        },
      },
      responses: {
        error: errorResponseObject,
      },
    },
    externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
  };
};
