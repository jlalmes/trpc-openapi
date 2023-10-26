import { OpenAPIV3 } from 'openapi-types';

import { OpenApiRouter } from '../types';
import {
  builtInZodComponentGenerator,
  zodComponentGenerator,
  zodComponentRegistry,
} from '../utils/registry';
import { getOpenApiPathsObject } from './paths';
import { errorResponseObject } from './schema';

export const openApiVersion = '3.0.3';

export type GenerateOpenApiDocumentOptions = {
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  docsUrl?: string;
  tags?: string[];
  securitySchemes?: OpenAPIV3.ComponentsObject['securitySchemes'];
};

export const generateOpenApiDocument = (
  appRouter: OpenApiRouter,
  opts: GenerateOpenApiDocumentOptions,
): OpenAPIV3.Document => {
  const securitySchemes = opts.securitySchemes || {
    Authorization: {
      type: 'http',
      scheme: 'bearer',
    },
  };
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
    paths: getOpenApiPathsObject(appRouter, Object.keys(securitySchemes)),
    components: {
      securitySchemes,
      schemas: {
        ...(zodComponentGenerator === 'built-in'
          ? builtInZodComponentGenerator()
          : zodComponentGenerator !== 'none' && zodComponentRegistry
          ? zodComponentGenerator(zodComponentRegistry)
          : {}),
      },
      responses: {
        error: errorResponseObject,
      },
    },
    tags: opts.tags?.map((tag) => ({ name: tag })),
    externalDocs: opts.docsUrl ? { url: opts.docsUrl } : undefined,
  };
};
