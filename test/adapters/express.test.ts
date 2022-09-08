/* eslint-disable @typescript-eslint/ban-types */
import { initTRPC } from '@trpc/server';
import express from 'express';
import fetch from 'node-fetch';
import { z } from 'zod';

import {
  CreateOpenApiExpressMiddlewareOptions,
  OpenApiMeta,
  OpenApiRouter,
  createOpenApiExpressMiddleware,
} from '../../src';

const createContextMock = jest.fn();
const responseMetaMock = jest.fn();
const onErrorMock = jest.fn();

const clearMocks = () => {
  createContextMock.mockClear();
  responseMetaMock.mockClear();
  onErrorMock.mockClear();
};

const createExpressServerWithRouter = <TRouter extends OpenApiRouter>(
  handlerOpts: CreateOpenApiExpressMiddlewareOptions<TRouter>,
  serverOpts?: { basePath?: `/${string}` },
) => {
  const openApiExpressMiddleware = createOpenApiExpressMiddleware({
    router: handlerOpts.router,
    createContext: handlerOpts.createContext ?? createContextMock,
    responseMeta: handlerOpts.responseMeta ?? responseMetaMock,
    onError: handlerOpts.onError ?? onErrorMock,
    maxBodySize: handlerOpts.maxBodySize,
  } as any);

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

const t = initTRPC.meta<OpenApiMeta>().context<any>().create();

describe('express adapter', () => {
  afterEach(() => {
    clearMocks();
  });

  test('with valid routes', async () => {
    const appRouter = t.router({
      sayHelloQuery: t.procedure
        .meta({ openapi: { method: 'GET', path: '/say-hello' } })
        .input(z.object({ name: z.string() }))
        .output(z.object({ greeting: z.string() }))
        .query(({ input }) => ({ greeting: `Hello ${input.name}!` })),
      sayHelloMutation: t.procedure
        .meta({ openapi: { method: 'POST', path: '/say-hello' } })
        .input(z.object({ name: z.string() }))
        .output(z.object({ greeting: z.string() }))
        .mutation(({ input }) => ({ greeting: `Hello ${input.name}!` })),
      sayHelloSlash: t.procedure
        .meta({ openapi: { method: 'GET', path: '/say/hello' } })
        .input(z.object({ name: z.string() }))
        .output(z.object({ greeting: z.string() }))
        .query(({ input }) => ({ greeting: `Hello ${input.name}!` })),
    });

    const { url, close } = createExpressServerWithRouter({
      router: appRouter,
    });

    {
      const res = await fetch(`${url}/say-hello?name=James`, { method: 'GET' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ greeting: 'Hello James!' });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);

      clearMocks();
    }
    {
      const res = await fetch(`${url}/say-hello`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'James' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ greeting: 'Hello James!' });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);

      clearMocks();
    }
    {
      const res = await fetch(`${url}/say/hello?name=James`, { method: 'GET' });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ greeting: 'Hello James!' });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
    }

    close();
  });

  test('with basePath', async () => {
    const appRouter = t.router({
      echo: t.procedure
        .meta({ openapi: { method: 'GET', path: '/echo' } })
        .input(z.object({ payload: z.string() }))
        .output(z.object({ payload: z.string(), context: z.undefined() }))
        .query(({ input }) => ({ payload: input.payload })),
    });

    const { url, close } = createExpressServerWithRouter(
      { router: appRouter },
      { basePath: '/open-api' },
    );

    const res = await fetch(`${url}/open-api/echo?payload=jlalmes`, { method: 'GET' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      payload: 'jlalmes',
    });
    expect(createContextMock).toHaveBeenCalledTimes(1);
    expect(responseMetaMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(0);

    close();
  });
});
