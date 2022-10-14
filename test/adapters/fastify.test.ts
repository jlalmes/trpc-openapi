import { initTRPC } from '@trpc/server';
import fastify from 'fastify';
import fetch from 'node-fetch';
import { z } from 'zod';

import {
  CreateOpenApiFastifyPluginOptions,
  OpenApiMeta,
  OpenApiRouter,
  fastifyTRPCOpenApiPlugin,
} from '../../src';

const createContextMock = jest.fn();
const responseMetaMock = jest.fn();
const onErrorMock = jest.fn();

const clearMocks = () => {
  createContextMock.mockClear();
  responseMetaMock.mockClear();
  onErrorMock.mockClear();
};

const createFastifyServerWithRouter = async <TRouter extends OpenApiRouter>(
  handler: CreateOpenApiFastifyPluginOptions<TRouter>,
  serverOpts?: { basePath?: `/${string}` },
) => {
  const server = fastify();

  const openApiFastifyPluginOptions: any = {
    router: handler.router,
    createContext: handler.createContext ?? createContextMock,
    responseMeta: handler.responseMeta ?? responseMetaMock,
    onError: handler.onError ?? onErrorMock,
    maxBodySize: handler.maxBodySize,
    basePath: serverOpts?.basePath,
  };

  await server.register(fastifyTRPCOpenApiPlugin, openApiFastifyPluginOptions);

  const port = 0;
  const url = await server.listen({ port });

  return {
    url,
    close: () => server.close(),
  };
};

const t = initTRPC.meta<OpenApiMeta>().context<any>().create();

describe('fastify adapter', () => {
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

    const { url, close } = await createFastifyServerWithRouter({ router: appRouter });

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

    await close();
  });

  test('with basePath', async () => {
    const appRouter = t.router({
      echo: t.procedure
        .meta({ openapi: { method: 'GET', path: '/echo' } })
        .input(z.object({ payload: z.string() }))
        .output(z.object({ payload: z.string(), context: z.undefined() }))
        .query(({ input }) => ({ payload: input.payload })),
    });

    const { url, close } = await createFastifyServerWithRouter(
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

    await close();
  });
});
