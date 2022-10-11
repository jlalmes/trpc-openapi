/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { inferAsyncReturnType, initTRPC } from '@trpc/server';
import { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import z from 'zod';

import { OpenApiMeta, createOpenApiAwsLambdaHandler } from '../../src';
import {
  mockAPIGatewayContext,
  mockAPIGatewayProxyEventV1,
  mockAPIGatewayProxyEventV2,
} from './aws-lambda.utils';

const createContextV1 = ({ event }: CreateAWSLambdaContextOptions<APIGatewayProxyEvent>) => {
  return {
    user: event.headers['X-USER'],
  };
};

const createContextV2 = ({ event }: CreateAWSLambdaContextOptions<APIGatewayProxyEventV2>) => {
  return {
    user: event.headers['X-USER'],
  };
};

const createRouter = (createContext: (obj: any) => { user?: string }) => {
  const t = initTRPC
    .context<inferAsyncReturnType<typeof createContext>>()
    .meta<OpenApiMeta>()
    .create();

  return t.router({
    hello: t.procedure
      .meta({
        openapi: {
          enabled: true,
          path: '/hello',
          method: 'GET',
        },
      })
      .input(
        z.object({
          name: z.string().optional(),
        }),
      )
      .output(
        z.object({
          text: z.string(),
        }),
      )
      .query(({ input, ctx }) => {
        return {
          text: `hello ${input?.name ?? ctx.user ?? 'world'}`,
        };
      }),
    echo: t.procedure
      .meta({
        openapi: {
          path: '/echo',
          method: 'GET',
        },
      })
      .input(
        z.object({
          name: z.string(),
        }),
      )
      .output(
        z.object({
          text: z.string(),
        }),
      )
      .query(({ input }) => {
        return {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          text: `hello ${input.name}`,
        };
      }),
    update: t.procedure
      .meta({
        openapi: {
          path: '/update',
          method: 'POST',
        },
      })
      .input(
        z.object({
          name: z.string(),
        }),
      )
      .output(
        z.object({
          text: z.string(),
        }),
      )
      .mutation(({ input }) => {
        return {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          text: `updated ${input.name}`,
        };
      }),
  });
};

const createContextlessRouter = () => {
  const t = initTRPC.meta<OpenApiMeta>().create();
  return t.router({
    hello: t.procedure
      .meta({
        openapi: {
          path: '/hello',
          method: 'GET',
        },
      })
      .input(
        z.object({
          name: z.string(),
        }),
      )
      .output(
        z.object({
          text: z.string(),
        }),
      )
      .query(({ input }) => ({ text: `hello ${input.name}` })),
  });
};

const ctx = mockAPIGatewayContext();
describe('aws-lambda-v1', () => {
  const routerV1 = createRouter(createContextV1);
  const handler = createOpenApiAwsLambdaHandler({
    router: routerV1,
    createContext: createContextV1,
  });

  test('basic GET', async () => {
    const { body, ...result } = await handler(
      mockAPIGatewayProxyEventV1({
        body: '',
        headers: { 'content-type': 'application/json', 'X-USER': 'Aphex' },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {},
        resource: '/hello',
      }),
      ctx,
    );

    const parsedBody = JSON.parse(body || '');

    expect(result).toMatchInlineSnapshot(`
          Object {
            "headers": Object {
              "content-type": "application/json",
            },
            "statusCode": 200,
          }
      `);

    expect(parsedBody).toMatchInlineSnapshot(`
          Object {
            "text": "hello Aphex",
          }
      `);
  });

  test('basic POST', async () => {
    const { body, ...result } = await handler(
      mockAPIGatewayProxyEventV1({
        body: JSON.stringify({
          name: 'Aphex',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        path: 'update',
        queryStringParameters: {},
        resource: '/update',
      }),
      ctx,
    );

    const parsedBody = JSON.parse(body || '');

    expect(result).toMatchInlineSnapshot(`
          Object {
            "headers": Object {
              "content-type": "application/json",
            },
            "statusCode": 200,
          }
      `);

    expect(parsedBody).toMatchInlineSnapshot(`
          Object {
            "text": "updated Aphex",
          }
      `);
  });

  test('bad type', async () => {
    const { body, ...result } = await handler(
      mockAPIGatewayProxyEventV1({
        body: '',
        headers: { 'content-type': 'application/json' },
        method: 'GET',
        path: 'echo',
        queryStringParameters: {
          wrong: 'Aphex',
        },
        resource: '/echo',
      }),
      ctx,
    );
    const parsedBody = JSON.parse(body || '');

    expect(result).toMatchInlineSnapshot(`
          Object {
            "headers": Object {
              "content-type": "application/json",
            },
            "statusCode": 400,
          }
        `);

    expect(parsedBody).toMatchInlineSnapshot(`
      Object {
        "code": "BAD_REQUEST",
        "issues": Array [
          Object {
            "code": "invalid_type",
            "expected": "string",
            "message": "Required",
            "path": Array [
              "name",
            ],
            "received": "undefined",
          },
        ],
        "message": "Input validation failed",
      }
    `);
  });
});

describe('aws-lambda-v2', () => {
  const router = createRouter(createContextV2);
  const handler = createOpenApiAwsLambdaHandler({
    router,
    createContext: createContextV2,
  });

  test('basic GET', async () => {
    const { body, ...result } = await handler(
      mockAPIGatewayProxyEventV2({
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json', 'X-USER': 'Aphex' },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );
    const parsedBody = JSON.parse(body || '');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "headers": Object {
          "content-type": "application/json",
        },
        "statusCode": 200,
      }
    `);
    expect(parsedBody).toMatchInlineSnapshot(`
      Object {
        "text": "hello Aphex",
      }
    `);
  });

  test('basic POST', async () => {
    const { body, ...result } = await handler(
      mockAPIGatewayProxyEventV2({
        body: JSON.stringify({
          name: 'Aphex',
        }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        path: 'update',
        queryStringParameters: {},
        routeKey: '$default',
      }),
      ctx,
    );

    const parsedBody = JSON.parse(body || '');

    expect(result).toMatchInlineSnapshot(`
      Object {
        "headers": Object {
          "content-type": "application/json",
        },
        "statusCode": 200,
      }
    `);

    expect(parsedBody).toMatchInlineSnapshot(`
      Object {
        "text": "updated Aphex",
      }
    `);
  });
});

describe('aws-lambda-v2 with contextless router', () => {
  test('basic GET', async () => {
    const router = createContextlessRouter();
    const handler = createOpenApiAwsLambdaHandler({
      router: router,
    });

    const { body, ...result } = await handler(
      mockAPIGatewayProxyEventV1({
        body: JSON.stringify({}),
        headers: { 'content-type': 'application/json' },
        method: 'GET',
        path: 'hello',
        queryStringParameters: {
          name: 'Aphex',
        },
        resource: '/hello',
      }),
      ctx,
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "headers": Object {
          "content-type": "application/json",
        },
        "statusCode": 200,
      }
    `);
    const parsedBody = JSON.parse(body || '');
    expect(parsedBody).toMatchInlineSnapshot(`
      Object {
        "text": "hello Aphex",
      }
    `);
  });
});
