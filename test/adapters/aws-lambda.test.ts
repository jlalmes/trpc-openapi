import { inferAsyncReturnType, initTRPC } from '@trpc/server';
import {
  CreateAWSLambdaContextOptions,
  UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
} from '@trpc/server/adapters/aws-lambda';
import { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import z from 'zod';

import { OpenApiMeta, createOpenApiAwsLambdaHandler } from '../../src';
import {
  mockAPIGatewayContext,
  mockAPIGatewayProxyEventV1,
  mockAPIGatewayProxyEventV2,
} from './aws-lambda.utils';

const createContextV1 = ({ event }: CreateAWSLambdaContextOptions<APIGatewayProxyEvent>) => {
  return { user: event.headers['X-USER'] };
};
const createContextV2 = ({ event }: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>) => {
  return { user: event.headers['X-USER'] };
};

const createRouter = (createContext: (obj: any) => { user?: string }) => {
  const t = initTRPC
    .context<inferAsyncReturnType<typeof createContext>>()
    .meta<OpenApiMeta>()
    .create();

  return t.router({
    getHello: t.procedure
      .meta({ openapi: { path: '/hello', method: 'GET' } })
      .input(z.object({ name: z.string().optional() }))
      .output(z.object({ greeting: z.string() }))
      .query(({ input, ctx }) => ({
        greeting: `Hello ${ctx.user ?? input.name ?? 'world'}`,
      })),
    postHello: t.procedure
      .meta({ openapi: { path: '/hello', method: 'POST' } })
      .input(z.object({ name: z.string() }))
      .output(z.object({ greeting: z.string() }))
      .mutation(({ input, ctx }) => ({
        greeting: `Hello ${ctx.user ?? input.name}`,
      })),
  });
};

const ctx = mockAPIGatewayContext();

describe('v1', () => {
  const routerV1 = createRouter(createContextV1);
  const handler = createOpenApiAwsLambdaHandler({
    router: routerV1,
    createContext: createContextV1,
  });

  test('with query input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV1({
        body: '',
        headers: {
          'content-type': 'application/json',
        },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {
          name: 'James',
        },
        resource: '/hello',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello James',
    });
  });

  test('with JSON body input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV1({
        body: JSON.stringify({
          name: 'Aphex',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        resource: '/hello',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello Aphex',
    });
  });

  test('with url encoded body input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV1({
        body: 'name=Aphex',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        resource: '/hello',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello Aphex',
    });
  });

  test('with context', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV1({
        body: '',
        headers: {
          'content-type': 'application/json',
          'X-USER': 'Twin',
        },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {},
        resource: '/hello',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello Twin',
    });
  });

  test('with bad input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV1({
        body: JSON.stringify({}),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        resource: '/hello',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(400);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
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
  });

  test('with invalid body', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV1({
        body: 'asdfasd',
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        resource: '/hello',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(400);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      message: 'Failed to parse request body',
      code: 'PARSE_ERROR',
    });
  });

  test('with bad event', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      // @ts-expect-error - invalid event
      { version: 'asdf' },
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(500);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      message: UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });
});

describe('v2', () => {
  const router = createRouter(createContextV2);
  const handler = createOpenApiAwsLambdaHandler({
    router,
    createContext: createContextV2,
  });

  test('with query input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV2({
        body: '',
        headers: {
          'content-type': 'application/json',
        },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {
          name: 'James',
        },
        routeKey: '$default',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello James',
    });
  });

  test('with JSON body input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV2({
        body: JSON.stringify({
          name: 'Aphex',
        }),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello Aphex',
    });
  });

  test('with url encoded body input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV2({
        body: 'name=Aphex',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello Aphex',
    });
  });

  test('with context', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV2({
        body: '',
        headers: {
          'content-type': 'application/json',
          'X-USER': 'Twin',
        },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(200);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      greeting: 'Hello Twin',
    });
  });

  test('with bad input', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV2({
        body: JSON.stringify({}),
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(400);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
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
  });

  test('with invalid body', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      mockAPIGatewayProxyEventV2({
        body: 'asdfasd',
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        path: 'hello',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(400);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      message: 'Failed to parse request body',
      code: 'PARSE_ERROR',
    });
  });

  test('with bad event', async () => {
    const {
      statusCode,
      headers,
      body: rawBody,
    } = await handler(
      // @ts-expect-error - invalid event
      { version: 'asdf' },
      ctx,
    );
    const body = JSON.parse(rawBody);

    expect(statusCode).toBe(500);
    expect(headers).toEqual({
      'content-type': 'application/json',
    });
    expect(body).toEqual({
      message: UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });
});
