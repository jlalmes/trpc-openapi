/* eslint-disable @typescript-eslint/ban-types */
import * as trpc from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { Server } from 'http';
import fetch from 'node-fetch';
import superjson from 'superjson';
import { z } from 'zod';

import {
  CreateOpenApiHttpHandlerOptions,
  OpenApiErrorResponse,
  OpenApiMeta,
  OpenApiRouter,
  OpenApiSuccessResponse,
  createOpenApiHttpHandler,
} from '../../src';

const createContextMock = jest.fn();
const responseMetaMock = jest.fn();
const onErrorMock = jest.fn();
const teardownMock = jest.fn();

const createHttpServerWithRouter = <TRouter extends OpenApiRouter>(
  handlerOpts: CreateOpenApiHttpHandlerOptions<TRouter>,
) => {
  const openApiHttpHandler = createOpenApiHttpHandler({
    router: handlerOpts.router,
    createContext: handlerOpts.createContext ?? (createContextMock as any),
    responseMeta: handlerOpts.responseMeta ?? (responseMetaMock as any),
    onError: handlerOpts.onError ?? (onErrorMock as any),
    teardown: handlerOpts.teardown ?? (teardownMock as any),
    maxBodySize: handlerOpts.maxBodySize,
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const server = new Server(openApiHttpHandler);

  server.listen(0);
  const port = (server.address() as any).port as number;
  const url = `http://localhost:${port}`;

  return {
    url,
    close: () => server.close(),
  };
};

describe('standalone adapter', () => {
  afterEach(() => {
    createContextMock.mockClear();
    responseMetaMock.mockClear();
    onErrorMock.mockClear();
    teardownMock.mockClear();
  });

  test('with invalid router', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('invalidRoute', {
      meta: { openapi: { enabled: true, path: '/invalid-route', method: 'POST' } },
      input: z.number(),
      resolve: ({ input }) => input,
    });

    expect(() => createOpenApiHttpHandler({ router: appRouter })).toThrowError(
      '[mutation.invalidRoute] - Output parser expects ZodType',
    );
  });

  test('with not found path', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('ping', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/ping' } },
        input: z.object({}),
        output: z.literal('pong'),
        resolve: () => 'pong' as const,
      }),
    });

    const res = await fetch(`${url}/pingg`, { method: 'POST' });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: { message: 'Not found', code: 'NOT_FOUND' } });
    expect(createContextMock).toHaveBeenCalledTimes(0);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with not found method', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('ping', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/ping' } },
        input: z.object({}),
        output: z.literal('pong'),
        resolve: () => 'pong' as const,
      }),
    });

    const res = await fetch(`${url}/ping`, { method: 'PATCH' });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(404);
    expect(body).toEqual({ ok: false, error: { message: 'Not found', code: 'NOT_FOUND' } });
    expect(createContextMock).toHaveBeenCalledTimes(0);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with invalid mimetype', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string() }),
        resolve: ({ input }) => ({ payload: input.payload }),
      }),
    });

    const res = await fetch(`${url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'non-json-string',
    });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Input validation failed',
        code: 'BAD_REQUEST',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Required',
            path: ['payload'],
            received: 'undefined',
          },
        ],
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with missing input', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().query('echo', {
        meta: { openapi: { enabled: true, method: 'GET', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string() }),
        resolve: ({ input }) => ({ payload: input.payload }),
      }),
    });

    const res = await fetch(`${url}/echo`, { method: 'GET' });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Input validation failed',
        code: 'BAD_REQUEST',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Required',
            path: ['payload'],
            received: 'undefined',
          },
        ],
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with wrong input type', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string() }),
        resolve: ({ input }) => ({ payload: input.payload }),
      }),
    });

    const res = await fetch(`${url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 123 }),
    });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Input validation failed',
        code: 'BAD_REQUEST',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Expected string, received number',
            path: ['payload'],
            received: 'number',
          },
        ],
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with bad output', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string() }),
        // @ts-expect-error - fail on purpose
        resolve: () => 'fail',
      }),
    });

    const res = await fetch(`${url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: '@jlalmes' }),
    });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Output validation failed',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with thrown error', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string() }),
        resolve: () => {
          throw new TRPCError({
            message: 'Custom thrown error',
            code: 'UNAUTHORIZED',
          });
        },
      }),
    });

    const res = await fetch(`${url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: '@jlalmes' }),
    });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(401);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Custom thrown error',
        code: 'UNAUTHORIZED',
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with valid routes', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc
        .router<any, OpenApiMeta>()
        .query('sayHello', {
          meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello' } },
          input: z.object({ name: z.string() }),
          output: z.object({ greeting: z.string() }),
          resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
        })
        .mutation('sayHello', {
          meta: { openapi: { enabled: true, method: 'POST', path: '/say-hello' } },
          input: z.string(),
          output: z.object({ greeting: z.string() }),
          resolve: ({ input }) => ({ greeting: `Hello ${input}!` }),
        }),
    });

    {
      const res = await fetch(`${url}/say-hello?name=James`, { method: 'GET' });
      const body = (await res.json()) as OpenApiSuccessResponse;

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true, data: { greeting: 'Hello James!' } });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
      expect(teardownMock).toHaveBeenCalledTimes(1);

      createContextMock.mockClear();
      responseMetaMock.mockClear();
      onErrorMock.mockClear();
      teardownMock.mockClear();
    }
    {
      const res = await fetch(`${url}/say-hello`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('James'),
      });
      const body = (await res.json()) as OpenApiSuccessResponse;

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true, data: { greeting: 'Hello James!' } });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
      expect(teardownMock).toHaveBeenCalledTimes(1);
    }

    close();
  });

  test('with no input', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().query('ping', {
        meta: { openapi: { enabled: true, method: 'GET', path: '/ping' } },
        input: z.object({}),
        output: z.literal('pong'),
        resolve: () => 'pong' as const,
      }),
    });

    const res = await fetch(`${url}/ping`, { method: 'GET' });
    const body = (await res.json()) as OpenApiSuccessResponse;

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, data: 'pong' });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with no output', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().query('ping', {
        meta: { openapi: { enabled: true, method: 'GET', path: '/ping' } },
        input: z.object({ ping: z.string() }),
        output: z.void(),
        resolve: () => undefined,
      }),
    });

    const res = await fetch(`${url}/ping?ping=ping`, { method: 'GET' });
    const body = (await res.json()) as OpenApiSuccessResponse;

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with createContext', async () => {
    type Context = { id: 1234567890 };

    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<Context, OpenApiMeta>().query('echo', {
        meta: { openapi: { enabled: true, method: 'GET', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string(), context: z.object({ id: z.number() }) }),
        resolve: ({ input, ctx }) => ({ payload: input.payload, context: ctx }),
      }),
      createContext: (): Context => ({ id: 1234567890 }),
    });

    const res = await fetch(`${url}/echo?payload=jlalmes`, { method: 'GET' });
    const body = (await res.json()) as OpenApiSuccessResponse;

    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        payload: 'jlalmes',
        context: { id: 1234567890 },
      },
    });
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with responseMeta', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().query('echo', {
        meta: { openapi: { enabled: true, method: 'GET', path: '/echo' } },
        input: z.object({ payload: z.string() }),
        output: z.object({ payload: z.string(), context: z.undefined() }),
        resolve: ({ input, ctx }) => ({ payload: input.payload, context: ctx }),
      }),
      responseMeta: () => ({ status: 202, headers: { 'x-custom': 'custom header' } }),
    });

    const res = await fetch(`${url}/echo?payload=jlalmes`, { method: 'GET' });
    const body = (await res.json()) as OpenApiSuccessResponse;

    expect(res.status).toBe(202);
    expect(res.headers.get('x-custom')).toBe('custom header');
    expect(body).toEqual({
      ok: true,
      data: {
        payload: 'jlalmes',
        context: undefined,
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with skipped transformer', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc
        .router<any, OpenApiMeta>()
        .transformer(superjson)
        .query('echo', {
          meta: { openapi: { enabled: true, method: 'GET', path: '/echo' } },
          input: z.object({ payload: z.string() }),
          output: z.object({ payload: z.string(), context: z.undefined() }),
          resolve: ({ input }) => ({ payload: input.payload }),
        }),
    });

    const res = await fetch(`${url}/echo?payload=jlalmes`, { method: 'GET' });
    const body = (await res.json()) as OpenApiSuccessResponse;

    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        payload: 'jlalmes',
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with warmup request', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>(),
    });

    const res = await fetch(`${url}/any-endpoint`, { method: 'HEAD' });

    expect(res.status).toBe(204);
    expect(createContextMock).toHaveBeenCalledTimes(0);
    expect(responseMetaMock).toHaveBeenCalledTimes(0);
    expect(onErrorMock).toHaveBeenCalledTimes(0);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with missing content-type header', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.string(),
        output: z.object({ payload: z.string() }),
        resolve: ({ input }) => ({ payload: input }),
      }),
    });

    const res = await fetch(`${url}/echo`, {
      method: 'POST',
      body: JSON.stringify('James'),
    });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Input validation failed',
        code: 'BAD_REQUEST',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            message: 'Expected string, received object',
            path: [],
            received: 'object',
          },
        ],
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with invalid json', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.string(),
        output: z.object({ payload: z.string() }),
        resolve: ({ input }) => ({ payload: input }),
      }),
    });

    const res = await fetch(`${url}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'James', // not JSON.stringified
    });
    const body = (await res.json()) as OpenApiErrorResponse;

    expect(res.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: {
        message: 'Failed to parse request body',
        code: 'PARSE_ERROR',
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(0);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);

    close();
  });

  test('with maxBodySize', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().mutation('echo', {
        meta: { openapi: { enabled: true, method: 'POST', path: '/echo' } },
        input: z.string(),
        output: z.object({ payload: z.string() }),
        resolve: ({ input }) => ({ payload: input }),
      }),
      maxBodySize: 10,
    });

    {
      const res = await fetch(`${url}/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('*'.repeat(8)),
      });
      const body = (await res.json()) as OpenApiSuccessResponse;

      expect(res.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        data: {
          payload: '********',
        },
      });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
      expect(teardownMock).toHaveBeenCalledTimes(1);

      createContextMock.mockClear();
      responseMetaMock.mockClear();
      onErrorMock.mockClear();
      teardownMock.mockClear();
    }
    {
      const res = await fetch(`${url}/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('*'.repeat(20)),
      });
      const body = (await res.json()) as OpenApiErrorResponse;

      expect(res.status).toBe(413);
      expect(body).toEqual({
        ok: false,
        error: {
          message: 'Request body too large',
          code: 'PAYLOAD_TOO_LARGE',
        },
      });
      expect(createContextMock).toHaveBeenCalledTimes(0);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(teardownMock).toHaveBeenCalledTimes(1);
    }

    close();
  });

  test.only('with multiple input query string params', async () => {
    const { url, close } = createHttpServerWithRouter({
      router: trpc.router<any, OpenApiMeta>().query('sayHello', {
        meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello' } },
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
        resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
      }),
    });

    {
      const res = await fetch(`${url}/say-hello?name=James&name=jlalmes`, { method: 'GET' });
      const body = (await res.json()) as OpenApiSuccessResponse;

      expect(res.status).toBe(200);
      expect(body).toEqual({ ok: true, data: { greeting: 'Hello James!' } });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
      expect(teardownMock).toHaveBeenCalledTimes(1);
    }

    close();
  });
});
