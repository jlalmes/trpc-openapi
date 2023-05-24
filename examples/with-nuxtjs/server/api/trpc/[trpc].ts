import { createNuxtApiHandler } from 'trpc-nuxt';

import { appRouter, createContext } from '../../router';

export default createNuxtApiHandler({
  router: appRouter,
  createContext,
});
