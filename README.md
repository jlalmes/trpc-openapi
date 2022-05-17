# trpc-openapi

Incremental adoption.

## Getting started

1. Install `trpc-openapi`.

```bash
# npm
npm install trpc-openapi
# yarn
yarn add trpc-openapi
```

2. Add `OpenApiMeta` to your tRPC router.

```typescript
import * as trpc from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';

export const appRouter = trpc.router<any, OpenApiMeta /* 👈 */>();
```

3. Enable `openapi` support for a procedure.

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

4. Generate OpenAPI v3 document

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

5. Add an `trpc-openapi` adapter to your app

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

6. Profit 🤑

```typescript
// client.ts
const res = await fetch('http://localhost:3000/api/say-hello?name=James', { method: 'GET' });
const body = await res.json(); /* { ok: true, data: { greeting: 'Hello James!' } } */
```

## Considerations

1. For a procedure to be valid for OpenAPI support it must have:

- OpenApiMeta (`openapi: {...}`)
  - `enabled: true`
  - `method: 'GET' | 'DELETE'` // query
  - `method: 'POST' | 'PUT' | 'PATCH'` // mutation
  - `path: starts with '/'`
- Zod input parser (`input:`)
- Zod output parser (`output:`)
