import * as trpc from '@trpc/server';
import { z } from 'zod';

import { OpenApiMeta, createOpenApiHttpHandler, generateOpenApiDocument } from '../src';

describe('adapter', () => {
  test('throws error with invalid router', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('invalidRoute', {
      meta: { openapi: { enabled: true, path: '/invalid-route', method: 'POST' } },
      input: z.number(),
      resolve: ({ input }) => input,
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[mutation.invalidRoute] - Output parser expects ZodSchema');
  });

  test('t', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('sayHello', {
      meta: { openapi: { enabled: true, path: '/say-hello', method: 'GET' } },
      input: z.object({ name: z.string() }),
      output: z.object({ greeting: z.string() }),
      resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
    });

    const openApiHttpHandler = createOpenApiHttpHandler(appRouter);
  });
});
