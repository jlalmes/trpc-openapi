import * as trpc from '@trpc/server';
import { TRPCError } from '@trpc/server';
import express from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

import {
  OpenApiErrorResponse,
  OpenApiMeta,
  OpenApiSuccessResponse,
  createOpenApiExpressHandler,
  createOpenApiNextHandler,
} from '../src';

describe('adapter', () => {
  test('throws error with invalid router', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('invalidRoute', {
      meta: { openapi: { enabled: true, path: '/invalid-route', method: 'POST' } },
      input: z.number(),
      resolve: ({ input }) => input,
    });

    expect(() => {
      createOpenApiExpressHandler({ router: appRouter });
    }).toThrowError('[mutation.invalidRoute] - Output parser expects ZodSchema');
    expect(() => {
      createOpenApiNextHandler({ router: appRouter });
    }).toThrowError('[mutation.invalidRoute] - Output parser expects ZodSchema');
  });

  test('createOpenApiExpressHandler', async () => {
    const createContextMock = jest.fn();
    const responseMetaMock = jest.fn();
    const onErrorMock = jest.fn();
    const teardownMock = jest.fn();

    const appRouter = trpc
      .router<any, OpenApiMeta>()
      .query('sayHelloQuery', {
        meta: { openapi: { enabled: true, path: '/say-hello', method: 'GET' } },
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
      })
      .mutation('sayHelloPost', {
        meta: { openapi: { enabled: true, path: '/say-hello', method: 'POST' } },
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
      })
      .query('sayHelloBadOutput', {
        meta: { openapi: { enabled: true, path: '/say-hello/bad-output', method: 'GET' } },
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        // @ts-expect-error - send bad output
        resolve: ({ input }) => ({ hello: input.name }),
      })
      .query('sayHelloUnauthorized', {
        meta: { openapi: { enabled: true, path: '/say-hello/unauthorized', method: 'GET' } },
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        resolve: () => {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Custom auth error' });
        },
      });

    const openApiHandler = createOpenApiExpressHandler({
      router: appRouter,
      createContext: createContextMock,
      responseMeta: responseMetaMock,
      onError: onErrorMock,
      teardown: teardownMock,
    });

    const app = express();
    app.use(express.json());
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    app.use('/open-api', openApiHandler);
    app.all('*', (_, res) => res.status(501).send('Unimplemented'));

    const server = app.listen(0);
    const port = (server.address() as any).port as number;
    const url = `http://localhost:${port}`;

    {
      // success query
      const res = await fetch(`${url}/open-api/say-hello?name=James`, { method: 'GET' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as OpenApiSuccessResponse;
      expect(body.ok).toBe(true);
      expect(body.data).toEqual({ greeting: 'Hello James!' });
    }
    {
      // success mutation
      const res = await fetch(`${url}/open-api/say-hello`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'James' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as OpenApiSuccessResponse;
      expect(body.ok).toBe(true);
      expect(body.data).toEqual({ greeting: 'Hello James!' });
    }
    {
      // missing handler path
      const res = await fetch(`${url}/say-hello?name=James`, { method: 'GET' });
      expect(res.status).toBe(501);
      const body = await res.text();
      expect(body).toBe('Unimplemented');
    }
    {
      // bad path
      const res = await fetch(`${url}/open-api/say-goodbye?name=James`, { method: 'GET' });
      expect(res.status).toBe(404);
      const body = (await res.json()) as OpenApiErrorResponse;
      expect(body.ok).toBe(false);
      expect(body.error).toEqual({ message: 'Not found', code: 'NOT_FOUND' });
    }
    {
      // bad method
      const res = await fetch(`${url}/open-api/say-hello?name=James`, { method: 'DELETE' });
      expect(res.status).toBe(404);
      const body = (await res.json()) as OpenApiErrorResponse;
      expect(body.ok).toBe(false);
      expect(body.error).toEqual({ message: 'Not found', code: 'NOT_FOUND' });
    }
    {
      // bad input
      const res = await fetch(`${url}/open-api/say-hello?age=26`, { method: 'GET' });
      expect(res.status).toBe(400);
      const body = (await res.json()) as OpenApiErrorResponse;
      expect(body.ok).toBe(false);
      expect(body.error).toEqual({
        message: 'Input validation failed',
        code: 'BAD_REQUEST',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Required',
            path: ['name'],
            received: 'undefined',
          },
        ],
      });
    }
    {
      // user thrown error
      const res = await fetch(`${url}/open-api/say-hello/unauthorized?name=James`, {
        method: 'GET',
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as OpenApiErrorResponse;
      expect(body.ok).toBe(false);
      expect(body.error).toEqual({
        message: 'Custom auth error',
        code: 'UNAUTHORIZED',
      });
    }

    server.close();
  });
});
