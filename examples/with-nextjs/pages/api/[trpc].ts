import { createOpenApiNextHandler } from 'trpc-openapi';

import { appRouter, createContext } from '../../server/router';

export default createOpenApiNextHandler({
  router: appRouter,
  createContext,
});
