import { createOpenApiNextHandler } from 'trpc-openapi';

import { appRouter, createContext } from '../../server/router';

// Handle incoming OpenAPI requests
export default createOpenApiNextHandler({
  router: appRouter,
  createContext,
});
