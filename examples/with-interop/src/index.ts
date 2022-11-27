import * as trpc from '@trpc/server';
import { OpenApiMeta } from 'trpc-openapi';
import { z } from 'zod';

const appRouter = trpc.router<any, OpenApiMeta>().query('echo', {
  meta: { openapi: { enabled: true, method: 'GET', path: '/echo' } },
  input: z.object({ payload: z.string() }),
  output: z.object({ payload: z.string() }),
  resolve: ({ input }) => input,
});

export const trpcV10AppRouter = appRouter.interop();
export const openApiV0AppRouter = appRouter;

export type AppRouter = typeof trpcV10AppRouter;

// Now add your `@trpc/server` && `trpc-openapi` handlers...
