import { generateOpenApiDocument } from 'trpc-openapi';

import { appRouter } from './router';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'tRPC <> OpenAPI <> Next.js',
  description: 'OpenAPI compliant REST API built using tRPC with Next.js',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000/api',
  docsUrl: 'https://github.com/jlalmes/trpc-openapi',
});
