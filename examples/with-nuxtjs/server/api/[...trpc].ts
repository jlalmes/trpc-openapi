import { createOpenApiNuxtHandler } from 'trpc-openapi';

import { appRouter, createContext } from '../router';

export default createOpenApiNuxtHandler({
  router: appRouter,
  createContext,
});
