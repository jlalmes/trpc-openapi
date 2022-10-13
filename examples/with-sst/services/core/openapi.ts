import { generateOpenApiDocument } from 'trpc-openapi';

import { appRouter } from './router';

// Generate OpenAPI schema document
export const openApiDocument = (domainName: string) =>
  generateOpenApiDocument(appRouter, {
    title: 'Example CRUD API',
    description: 'OpenAPI compliant REST API built using tRPC with AWS Lambda',
    version: '1.0.0',
    baseUrl: `https://${domainName}`,
    docsUrl: 'https://github.com/jlalmes/trpc-openapi',
    tags: ['auth', 'users', 'posts'],
  });
