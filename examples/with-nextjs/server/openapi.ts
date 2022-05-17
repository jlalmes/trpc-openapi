/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {z} from 'zod';

const zod_1 = require('zod');

// @ts-ignore
console.log({ match: z.ZodObject instanceof zod_1.z.ZodObject })

import { generateOpenApiDocument } from 'trpc-openapi';

import { appRouter } from './router';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'tRPC <> OpenAPI <> Next.js',
  description: 'OpenAPI compliant REST API build using tRPC with Next.js',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000',
  docsUrl: 'https://github.com/jlalmes/trpc-openapi',
});
