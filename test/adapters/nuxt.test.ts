/* eslint-disable @typescript-eslint/ban-types */
import { initTRPC } from '@trpc/server';
import { H3Event, NodeIncomingMessage, NodeServerResponse, defineEventHandler } from 'h3';
import httpMocks, { RequestMethod } from 'node-mocks-http';
import { z } from 'zod';

import {
  CreateOpenApiNuxtHandlerOptions,
  OpenApiMeta,
  OpenApiResponse,
  OpenApiRouter,
  createOpenApiNuxtHandler,
} from '../../src';

const createContextMock = jest.fn();
const responseMetaMock = jest.fn();
const onErrorMock = jest.fn();

const clearMocks = () => {
  createContextMock.mockClear();
  responseMetaMock.mockClear();
  onErrorMock.mockClear();
};

const createOpenApiNuxtHandlerCaller = <TRouter extends OpenApiRouter>(
  handlerOpts: CreateOpenApiNuxtHandlerOptions<TRouter>,
) => {
  const openApiNuxtHandler = createOpenApiNuxtHandler({
    router: handlerOpts.router,
    createContext: handlerOpts.createContext ?? createContextMock,
    responseMeta: handlerOpts.responseMeta ?? responseMetaMock,
    onError: handlerOpts.onError ?? onErrorMock,
  } as never);

  /* eslint-disable-next-line @typescript-eslint/no-misused-promises, no-async-promise-executor */
  return (req: {
    method: RequestMethod;
    params: Record<string, string>;
    query?: Record<string, string>;
    body?: any;
  }) =>
    new Promise<{
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

      const mockReq = httpMocks.createRequest({
        body: req.body,
        method: req.method,
        query: req.query,
      });
      const mockRes = httpMocks.createResponse({
        req: mockReq,
      });
      mockRes.setHeader = res.setHeader;
      mockRes.end = res.end;
      const event = new H3Event(mockReq, mockRes);
      event.context.params = req.params;
      try {
        await openApiNuxtHandler(event);
        resolve({
          statusCode: mockRes.statusCode,
          headers,
          body,
        });
      } catch (error) {
        reject(error);
      }
    });
};

const t = initTRPC.meta<OpenApiMeta>().context<any>().create();

describe('nuxt adapter', () => {
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

    const openApiNuxtHandlerCaller = createOpenApiNuxtHandlerCaller({
      router: appRouter,
    });

    {
      const res = await openApiNuxtHandlerCaller({
        method: 'GET',
        params: { trpc: 'say-hello' },
        query: { name: 'James' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ greeting: 'Hello James!' });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);

      clearMocks();
    }
    {
      const res = await openApiNuxtHandlerCaller({
        method: 'POST',
        params: { trpc: 'say-hello' },
        body: { name: 'James' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ greeting: 'Hello James!' });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);

      clearMocks();
    }
    {
      const res = await openApiNuxtHandlerCaller({
        method: 'GET',
        params: { trpc: 'say/hello' },
        query: { name: 'James' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ greeting: 'Hello James!' });
      expect(createContextMock).toHaveBeenCalledTimes(1);
      expect(responseMetaMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledTimes(0);
    }
  });

  test('with invalid path', async () => {
    const appRouter = t.router({});

    const openApiNuxtHandlerCaller = createOpenApiNuxtHandlerCaller({
      router: appRouter,
    });

    const res = await openApiNuxtHandlerCaller({
      method: 'GET',
      params: {},
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      message: 'Query "trpc" not found - is the `trpc-openapi` file named `[...trpc].ts`?',
      code: 'INTERNAL_SERVER_ERROR',
    });
    expect(createContextMock).toHaveBeenCalledTimes(0);
    expect(responseMetaMock).toHaveBeenCalledTimes(0);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
  });
});
