<p align="left">
  <a href="/">
    <img src="./assets/trpc-openapi.svg" alt="tRPC-OpenAPI" height="100"/>
  </a>
</p>

# trpc-openapi

### **[OpenAPI](https://swagger.io/specification/) support for [tRPC](https://trpc.io/)** 🧩

- Easy REST endpoints for your tRPC procedures.
- Perfect for incremental adoption.
- OpenAPI version 3.0.3.

## Usage

**1. Install `trpc-openapi`.**

```bash
# npm
npm install trpc-openapi
# yarn
yarn add trpc-openapi
```

**2. Add `OpenApiMeta` to your tRPC router.**

```typescript
import * as trpc from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';

export const appRouter = trpc.router<any, OpenApiMeta /* 👈 */>();
```

**3. Enable `openapi` support for a procedure.**

```typescript
import * as trpc from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';

export const appRouter = trpc.router<any, OpenApiMeta>().query('sayHello', {
  meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello' } /* 👈 */ },
  input: z.object({ name: z.string() }),
  output: z.object({ greeting: z.string() }),
  resolve: ({ input }) => {
    return { greeting: `Hello ${input.name}!` };
  },
});
```

**4. Generate OpenAPI v3 document.**

```typescript
import { generateOpenApiDocument } from 'trpc-openapi';

import { appRouter } from '../appRouter';

/* 👇 */
export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'tRPC OpenAPI',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000',
});
```

**5. Add an `trpc-openapi` handler to your app.**

We currently support adapters for [`Express`](http://expressjs.com/), [`Next.js`](https://nextjs.org/) & [`node:http`](https://nodejs.org/api/http.html).

[`Fastify`](https://www.fastify.io/) & [`Serverless`](https://www.serverless.com/) soon™, PRs are welcomed 🙌.

```typescript
import http from 'http';
import { createOpenApiHttpHandler } from 'trpc-openapi';

import { appRouter } from '../appRouter';

const server = http.createServer(createOpenApiHttpHandler({ router: appRouter })); /* 👈 */

server.listen(3000);
```

**6. Profit 🤑**

```typescript
// client.ts
const res = await fetch('http://localhost:3000/say-hello?name=James', { method: 'GET' });
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## Requirements

For every OpenAPI enabled procedure the following _must_ be true:

- [`tRPC`](https://github.com/trpc/trpc) version 9 (`@trpc/server@^9.23.0`) is installed.
- Both `input` and `output` parsers are present.
- Parsers use [`Zod`](https://github.com/colinhacks/zod) validation.
- Query `input` parsers extend `ZodObject<{ [string]: ZodString }>`.
- Mutation `input` parsers extend `ZodObject<{ [string]: ZodType }>`.
- `meta.openapi.enabled` is set to `true`.
- `meta.openapi.method` is `GET` or `DELETE` for queries OR `POST`, `PUT` or `PATCH` for mutations.
- `meta.openapi.path` is a string starting with `/`.
- `meta.openapi.path` parameters exist in `input` parser as `ZodString`

Please note:

- Data [`transformers`](https://trpc.io/docs/data-transformers) are ignored.
- Trailing slashes are ignored.
- Routing is case-insensitive.

## Authorization

To create protected endpoints, just add `protect: true` to the `meta.openapi` object of each tRPC procedure. You can then authenticate each request with the `createContext` function using the `Authorization` header with the `Bearer` scheme.

Explore a [complete example here](examples/with-nextjs/src/server/router.ts).

#### Server

```typescript
import * as trpc from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';

type User = { id: string; name: string };

const users: User[] = [
  {
    id: 'usr_123',
    name: 'James',
  },
];

export type Context = { user: User | null };

export const createContext = async ({ req, res }): Promise<Context> => {
  let user: User | null = null;
  if (req.headers.authorization) {
    const userId = req.headers.authorization.split(' ')[1];
    user = users.find((_user) => _user.id === userId);
  }
  return { user };
};

export const appRouter = trpc.router<Context, OpenApiMeta>().query('sayHello', {
  meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello', protect: true /* 👈 */ } },
  input: z.void(), // no input expected
  output: z.object({ greeting: z.string() }),
  resolve: ({ input, ctx }) => {
    if (!ctx.user) {
      throw new trpc.TRPCError({ message: 'User not found', code: 'UNAUTHORIZED' });
    }
    return { greeting: `Hello ${ctx.user.name}!` };
  },
});
```

#### Client

```typescript
const res = await fetch('http://localhost:3000/say-hello', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer usr_123' }, /* 👈 */
});
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## HTTP Requests

Query procedures accept inputs via URL `query parameters`.

Mutation procedures accept inputs via the `request body` as a `application/json` content type.

### Path parameters

Both queries & mutations can accept a set of their inputs via URL path parameters. You can add a path parameter to any OpenAPI enabled procedure by using curly brackets around an input name as a path segment in the `meta.openapi.path` field.

#### Query

```typescript
// Router
export const appRouter = trpc.router<Context, OpenApiMeta>().query('sayHello', {
  meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello/{name}' /* 👈 */ } },
  input: z.object({ name: z.string() /* 👈 */, greeting: z.string() }),
  output: z.object({ greeting: z.string() }),
  resolve: ({ input }) => {
    return { greeting: `${input.greeting} ${input.name}!` };
  },
});

// Client
const res = await fetch('http://localhost:3000/say-hello/James?greeting=Hello' /* 👈 */, { method: 'GET' });
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

#### Mutation

```typescript
// Router
export const appRouter = trpc.router<Context, OpenApiMeta>().mutation('sayHello', {
  meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello/{name}' /* 👈 */ } },
  input: z.object({ name: z.string() /* 👈 */, greeting: z.string() }),
  output: z.object({ greeting: z.string() }),
  resolve: ({ input }) => {
    return { greeting: `${input.greeting} ${input.name}!` };
  },
});

// Client
const res = await fetch('http://localhost:3000/say-hello/James' /* 👈 */, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ greeting: 'Hello' }),
});
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## HTTP Responses

Inspired by [Slack Web API](https://api.slack.com/web).

Status codes will be `200` by default for any successful requests. In the case of an error, the status code will be derived from the thrown `TRPCError` or fallback to `500`. You can modify the status code for any response using the `responseMeta` function.

Please see [error status codes here](src/adapters/node-http/errors.ts).

```jsonc
{
  "ok": true,
  "data": "This is good" /* Output from procedure */
}
```

```jsonc
{
  "ok": false,
  "error": {
    "message": "This is bad" /* TRPCError message */,
    "code": "BAD_REQUEST" /* TRPCError code */
  }
}
```

## Examples

_For advanced use-cases, please find examples in our [complete test suite](test)._

#### With Express

Please see [full example here](examples/with-express).

```typescript
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { createOpenApiExpressMiddleware } from 'trpc-openapi';

import { appRouter } from '../appRouter';

const app = express();

app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));
app.use('/api', createOpenApiExpressMiddleware({ router: appRouter })); /* 👈 */

app.listen(3000);
```

#### With Next.js

Please see [full example here](examples/with-nextjs).

```typescript
// pages/api/[trpc].ts
import { createOpenApiNextHandler } from 'trpc-openapi';

import { appRouter } from '../../server/appRouter';

export default createOpenApiNextHandler({ router: appRouter });
```

## Types

#### OpenApiMeta

Please see [full typings here](src/types.ts).

| Property      | Type         | Description                                                                                                            | Required | Default     |
| ------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| `enabled`     | `boolean`    | Exposes procedure to `trpc-openapi` adapters and on the OpenAPI document                                               | `true`   | `false`     |
| `method`      | `HttpMethod` | Method this endpoint is exposed on. Value can be `GET` or `DELETE` for query OR `POST`, `PUT` or `PATCH` for mutation. | `true`   | `undefined` |
| `path`        | `string`     | Pathname this endpoint is exposed on. Value must start with `/`. Specify parameters using `{}`.                        | `true`   | `undefined` |
| `protect`     | `boolean`    | Requires this endpoint to use an `Authorization` header credential using the `Bearer` scheme on OpenAPI document.      | `false`  | `false`     |
| `summary`     | `string`     | A short summary included in the OpenAPI document.                                                                      | `false`  | `undefined` |
| `description` | `string`     | A verbose description included in the OpenAPI document.                                                                | `false`  | `undefined` |
| `tag`         | `string`     | A tag to group endpoints in the OpenAPI document.                                                                      | `false`  | `undefined` |

#### GenerateOpenApiDocumentOptions

Please see [full typings here](src/generator/index.ts).

| Property      | Type       | Description                            | Required |
| ------------- | ---------- | -------------------------------------- | -------- |
| `title`       | `string`   | The title of the API.                  | `true`   |
| `description` | `string`   | A short description of the API.        | `false`  |
| `version`     | `string`   | The version of the OpenAPI document.   | `true`   |
| `baseUrl`     | `string`   | The base URL of the target server.     | `true`   |
| `docsUrl`     | `string`   | A URL to any external documentation.   | `false`  |
| `tags`        | `string[]` | Tag list for ordering endpoint groups. | `false`  |

#### CreateOpenApiNodeHttpHandlerOptions

Please see [full typings here](src/adapters/node-http/core.ts).

| Property        | Type       | Description                                                                   | Required |
| --------------- | ---------- | ----------------------------------------------------------------------------- | -------- |
| `router`        | `Router`   | The title of the API.                                                         | `true`   |
| `createContext` | `Function` | Function called on request that passes contextual data to procedure resolver. | `false`  |
| `responseMeta`  | `Function` | Function that returns modifications to statusCode & headers on each response. | `false`  |
| `onError`       | `Function` | Function called if error occurs inside handler.                               | `false`  |
| `teardown`      | `Function` | Function called after each request is completed.                              | `false`  |
| `maxBodySize`   | `number`   | Controls the maximum request body size in bytes (default: 100kb).             | `false`  |

---

## License

Distributed under the MIT License. See LICENSE for more information.

## Contact

James Berry - Follow me on Twitter [@jlalmes](https://twitter.com/jlalmes) 💚
