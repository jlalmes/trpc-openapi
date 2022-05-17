# trpc-openapi

### **[OpenAPI](https://swagger.io/specification/) support for [tRPC](https://trpc.io/)**

- Support REST protocol while moving fast.
- Perfect for incremental adoption.
- OpenAPI version 3.0.3.

## Usage

1. **Install `trpc-openapi`.**

```bash
# npm
npm install trpc-openapi
# yarn
yarn add trpc-openapi
```

2. **Add `OpenApiMeta` to your tRPC router.**

```typescript
import * as trpc from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';

export const appRouter = trpc.router<any, OpenApiMeta /* 👈 */>();
```

3. **Enable `openapi` support for a procedure.**

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

4. **Generate OpenAPI v3 document.**

```typescript
import { generateOpenApiDocument } from 'trpc-openapi';

import { appRouter } from '../appRouter';

/* 👇 */
const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'tRPC OpenAPI',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000/api',
});
```

5. **Add an `trpc-openapi` adapter to your app.**

Current support for `Express`, `Next.js` & `node:http`.

```typescript
import http from 'http';
import { createOpenApiHttpHandler } from 'trpc-openapi';

import { appRouter } from '../appRouter';

const server = http.createServer(createOpenApiHttpHandler({ router: appRouter })); /* 👈 */

server.listen(3000);
```

6. **Profit 🤑**

```typescript
// client.ts
const res = await fetch('http://localhost:3000/say-hello?name=James', { method: 'GET' });
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## Requirements

For every OpenAPI enabled procedure the following _must_ be true:

- `meta.openapi.enabled` is `true`.
- `meta.openapi.method` is `GET` or `DELETE` if query procedure OR `POST`, `PUT` or `PATCH` if mutation procedure.
- `meta.openapi.path` is a string starting with `/`.
- Both `input` and `output` parsers are present.
- Parsers use `zod` validators.
- `input` parsers extend `Record<string, string>`.

## Authorization

To create protected endpoints, just add `secure: true` to the `meta.openapi` object of each tRPC procedure. You can then authenticate each request in `createContext` function using the `Authorization` header.

Please explore a more complete example [here](https://github.com/jlalmes/trpc-openapi/tree/master/examples/with-express).

```typescript
// server.js
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
  meta: { openapi: { enabled: true, method: 'GET', path: '/say-hello', secure: true /* 👈 */ } },
  input: z.object({}), // no input expected
  output: z.object({ greeting: z.string() }),
  resolve: ({ input, ctx }) => {
    if (!ctx.user) {
      throw new trpc.TRPCError({ message: 'User not found', code: 'UNAUTHORIZED' });
    }
    return { greeting: `Hello ${ctx.user.name}!` };
  },
});
```

```typescript
// client.ts
const res = await fetch('http://localhost:3000/say-hello', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer usr_123' }, /* 👈 */
});
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## Examples

#### With Express

Please see full example project [here](https://github.com/jlalmes/trpc-openapi/tree/master/examples/with-express).

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

Please see full example project [here](https://github.com/jlalmes/trpc-openapi/tree/master/examples/with-next).

```typescript
// pages/api/[trpc].ts
import { createOpenApiNextHandler } from 'trpc-openapi';

import { appRouter } from '../../server/appRouter';

export default createOpenApiNextHandler({ router: appRouter });
```

## Types

#### OpenApiMeta

Please see full typings [here](https://github.com/jlalmes/trpc-openapi/blob/master/src/types.ts).

| Property      | Type         | Description                                                                                                         | Required | Default     |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| `enabled`     | `boolean`    | Exposes procedure on `trpc-openapi` adapters and in OpenAPI documents                                               | `true`   | `false`     |
| `method`      | `HttpMethod` | Method this route is exposed on. Value can be `GET` or `DELETE` for query OR `POST`, `PUT` or `PATCH` for mutation. | `true`   | `undefined` |
| `path`        | `string`     | Path this route is exposed on. Value must start with `/`.                                                           | `true`   | `undefined` |
| `secure`      | `boolean`    | Requires this route to have an `Authorization` header credential using the `Bearer` scheme on OpenAPI document.     | `false`  | `false`     |
| `description` | `string`     | Route description included in OpenAPI document.                                                                     | `false`  | `undefined` |
| `tags`        | `string[]`   | Route tags included in OpenAPI document.                                                                            | `false`  | `[]`        |

#### GenerateOpenApiDocumentOptions

Please see full typings [here](https://github.com/jlalmes/trpc-openapi/blob/master/src/generator/index.ts).

| Property      | Type     | Description                          | Required |
| ------------- | -------- | ------------------------------------ | -------- |
| `title`       | `string` | The title of the API.                | `true`   |
| `description` | `string` | A short description of the API.      | `false`  |
| `version`     | `string` | The version of the OpenAPI document. | `true`   |
| `baseUrl`     | `string` | The base URL of the target server.   | `true`   |
| `docsUrl`     | `string` | A URL to any external documentation. | `false`  |

#### CreateOpenApiHttpHandlerOptions

Please see full typings [here](https://github.com/jlalmes/trpc-openapi/blob/master/src/adapters/node-http/core.ts).

| Property        | Type       | Description                                                                   | Required |
| --------------- | ---------- | ----------------------------------------------------------------------------- | -------- |
| `router`        | `Router`   | The title of the API.                                                         | `true`   |
| `createContext` | `Function` | Function called on request that passes contextual data to procedure resolver. | `false`  |
| `responseMeta`  | `Function` | Function that returns modifications to statusCode & headers on each response. | `false`  |
| `onError`       | `Function` | Function called if error occurs inside handler.                               | `false`  |
| `teardown`      | `Function` | Function called after each request is completed.                              | `false`  |
| `maxBodySize`   | `number`   | Controls the maximum request body size in bytes.                              | `false`  |
