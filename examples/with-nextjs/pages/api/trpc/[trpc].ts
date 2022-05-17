import { createNextApiHandler } from '@trpc/server/adapters/next';

import { appRouter, createContext } from '../../../server/router';

export default createNextApiHandler({
  router: appRouter,
  createContext,
});
