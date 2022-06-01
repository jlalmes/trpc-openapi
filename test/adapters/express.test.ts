/* eslint-disable @typescript-eslint/ban-types */
import * as trpc from '@trpc/server';
import express from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

import {
  CreateOpenApiExpressMiddlewareOptions,
  OpenApiMeta,
  OpenApiRouter,
  OpenApiSuccessResponse,
  createOpenApiExpressMiddleware,
} from '../../src';

const createContextMock = jest.fn();
const responseMetaMock = jest.fn();
const onErrorMock = jest.fn();
const teardownMock = jest.fn();

const createExpressServerWithRouter = <TRouter extends OpenApiRouter>(
  handlerOpts: CreateOpenApiExpressMiddlewareOptions<TRouter>,
  serverOpts?: { basePath?: `/${string}` },
) => {
  const openApiExpressMiddleware = createOpenApiExpressMiddleware({
    router: handlerOpts.router,
    createContext: handlerOpts.createContext ?? (createContextMock as any),
    responseMeta: handlerOpts.responseMeta ?? (responseMetaMock as any),
    onError: handlerOpts.onError ?? (onErrorMock as any),
    teardown: handlerOpts.teardown ?? (teardownMock as any),
    maxBodySize: handlerOpts.maxBodySize,
  });

  const app = express();

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.use(serverOpts?.basePath ?? '/', openApiExpressMiddleware);

  const server = app.listen(0);
  const port = (server.address() as any).port as number;
  const url = `http://localhost:${port}`;

  return {
    url,
    close: () => server.close(),
  };
};

describe('express adapter', () => {
  afterEach(() => {
    createContextMock.mockClear();
    responseMetaMock.mockClear();
    onErrorMock.mockClear();
    teardownMock.mockClear();
  });

  test('with valid routes', async () => {
    const { url, close } = createExpressServerWithRouter({
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
          input: z.object({ name: z.string() }),
          output: z.object({ greeting: z.string() }),
          resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
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
        body: JSON.stringify({ name: 'James' }),
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

  test('with basePath', async () => {
    const { url, close } = createExpressServerWithRouter(
      {
        router: trpc.router<any, OpenApiMeta>().query('echo', {
          meta: { openapi: { enabled: true, method: 'GET', path: '/echo' } },
          input: z.object({ payload: z.string() }),
          output: z.object({ payload: z.string(), context: z.undefined() }),
          resolve: ({ input }) => ({ payload: input.payload }),
        }),
      },
      { basePath: '/open-api' },
    );

    const res = await fetch(`${url}/open-api/echo?payload=jlalmes`, { method: 'GET' });
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
});
