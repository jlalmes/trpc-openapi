/* eslint-disable @typescript-eslint/ban-types */
import * as trpc from '@trpc/server';
import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import {
  CreateOpenApiNextHandlerOptions,
  OpenApiMeta,
  OpenApiResponse,
  OpenApiRouter,
  createOpenApiNextHandler,
} from '../../src';

const createContextMock = jest.fn();
const responseMetaMock = jest.fn();
const onErrorMock = jest.fn();
const teardownMock = jest.fn();

const createOpenApiNextHandlerCaller = <TRouter extends OpenApiRouter>(
  handlerOpts: CreateOpenApiNextHandlerOptions<TRouter>,
) => {
  const openApiNextHandler = createOpenApiNextHandler({
    router: handlerOpts.router,
    createContext: handlerOpts.createContext ?? (createContextMock as any),
    responseMeta: handlerOpts.responseMeta ?? (responseMetaMock as any),
    onError: handlerOpts.onError ?? (onErrorMock as any),
    teardown: handlerOpts.teardown ?? (teardownMock as any),
  });

  return (req: { method: string; query: Record<string, any>; body?: any }) => {
    return new Promise<{
      statusCode: number;
      headers: Record<string, any>;
      body: OpenApiResponse | undefined;
      /* eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor */
    }>(async (resolve, reject) => {
      const headers = new Map();
      let body: any;
      const res: any = {
        statusCode: undefined,
        setHeader: (key: string, value: any) => headers.set(key, value),
        end: (data: string) => {
          body = JSON.parse(data);
        },
      };

      try {
        await openApiNextHandler(
          req as unknown as NextApiRequest,
          res as unknown as NextApiResponse,
        );
        resolve({
          statusCode: res.statusCode,
          headers: Object.fromEntries(headers.entries()),
          body,
        });
      } catch (error) {
        reject(error);
      }
    });
  };
};

describe('next adapter', () => {
  afterEach(() => {
    createContextMock.mockClear();
    responseMetaMock.mockClear();
    onErrorMock.mockClear();
    teardownMock.mockClear();
  });

  test('with valid routes', async () => {
    const openApiNextHandlerCaller = createOpenApiNextHandlerCaller({
      router: trpc
        .router<any, OpenApiMeta>()
        .query('sayHello', {
          meta: { openapi: { method: 'GET', path: '/say-hello' } },
          input: z.object({ name: z.string() }),
          output: z.object({ greeting: z.string() }),
          resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
        })
        .mutation('sayHello', {
          meta: { openapi: { method: 'POST', path: '/say-hello' } },
          input: z.object({ name: z.string() }),
          output: z.object({ greeting: z.string() }),
          resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
        })
        .query('sayHelloSplit', {
          meta: { openapi: { method: 'GET', path: '/say/hello' } },
          input: z.object({ name: z.string() }),
          output: z.object({ greeting: z.string() }),
          resolve: ({ input }) => ({ greeting: `Hello ${input.name}!` }),
        }),
    });

    {
      const res = await openApiNextHandlerCaller({
        method: 'GET',
        query: { trpc: 'say-hello', name: 'James' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true, data: { greeting: 'Hello James!' } });
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
      const res = await openApiNextHandlerCaller({
        method: 'POST',
        query: { trpc: 'say-hello' },
        body: { name: 'James' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true, data: { greeting: 'Hello James!' } });
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
      const res = await openApiNextHandlerCaller({
        method: 'GET',
        query: { trpc: ['say', 'hello'], name: 'James' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true, data: { greeting: 'Hello James!' } });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
      expect(teardownMock).toHaveBeenCalledTimes(1);
    }
  });

  test('with invalid path', async () => {
    const openApiNextHandlerCaller = createOpenApiNextHandlerCaller({
      router: trpc.router(),
    });

    const res = await openApiNextHandlerCaller({
      method: 'GET',
      query: {},
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      ok: false,
      error: {
        message: 'Query "trpc" not found - is the `trpc-openapi` file named `[...trpc].ts`?',
        code: 'INTERNAL_SERVER_ERROR',
      },
    });
    expect(createContextMock).toHaveBeenCalledTimes(0);
    expect(responseMetaMock).toHaveBeenCalledTimes(0);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(teardownMock).toHaveBeenCalledTimes(1);
  });
});
