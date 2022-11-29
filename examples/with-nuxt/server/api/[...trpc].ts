import { defineEventHandler } from 'h3';
import { createOpenApiNuxtHandler } from 'trpc-openapi';

import { appRouter, createContext } from '../../server/router';

export default defineEventHandler((event) => {
  return createOpenApiNuxtHandler({ router: appRouter, createContext })(event);
});
