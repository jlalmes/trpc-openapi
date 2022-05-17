# trpc-openapi

Incremental adoption. Version 3.0.3

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

We currently support for `Express`, `Next.js` & `node:http`.

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

6. **Profit 🤑**

```typescript
// client.ts
const res = await fetch('http://localhost:3000/api/say-hello?name=James', { method: 'GET' });
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## Authorization

To create protected endpoints, just add `secure: true` to the `meta.openapi` object of each tRPC procedure.

## Examples

#### With Express

Please see example project [here](https://github.com/jlalmes/trpc-openapi/tree/master/examples/with-express).

#### With Next.js

Please see example project [here](https://github.com/jlalmes/trpc-openapi/tree/master/examples/with-next).

## Types

#### OpenApiMeta

Please see typings [here](https://github.com/jlalmes/trpc-openapi/blob/master/src/types.ts).

| Property      | Type         | Description                                                                                                         | Required | Default     |
| ------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| `enabled`     | `boolean`    | Exposes procedure on `trpc-openapi` adapters and in OpenAPI documents                                               | `true`   | `false`     |
| `method`      | `HttpMethod` | Method this route is exposed on. Value can be `GET` or `DELETE` for query OR `POST`, `PUT` or `PATCH` for mutation. | `true`   | `undefined` |
| `path`        | `string`     | Path this route is exposed on. Value must start with `/`.                                                           | `true`   | `undefined` |
| `secure`      | `boolean`    | Requires this route to have an `Authorization` header credential using the `Bearer` scheme.                         | `false`  | `false`     |
| `description` | `string`     | Route description included in OpenAPI document.                                                                     | `false`  | `undefined` |
| `tags`        | `string[]`   | Route tags included in OpenAPI document.                                                                            | `false`  | `[]`        |

#### GenerateOpenApiDocumentOptions

Please see typings [here](https://github.com/jlalmes/trpc-openapi/blob/master/src/generator/index.ts).

| Property      | Type     | Description                          | Required | Default     |
| ------------- | -------- | ------------------------------------ | -------- | ----------- |
| `title`       | `string` | The title of the API.                | `true`   | `undefined` |
| `description` | `string` | A short description of the API.      | `false`  | `undefined` |
| `version`     | `string` | The version of the OpenAPI document. | `true`   | `undefined` |
| `baseUrl`     | `string` | The base URL of the target server.   | `true`   | `undefined` |
| `docsUrl`     | `string` | A URL to any external documentation. | `false`  | `undefined` |

#### CreateOpenApiHttpHandlerOptions

Please see typings [here](https://github.com/jlalmes/trpc-openapi/blob/master/src/adapters/node-http/core.ts).
