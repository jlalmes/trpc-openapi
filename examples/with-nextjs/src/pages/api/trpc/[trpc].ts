import { createNextApiHandler } from '@trpc/server/adapters/next';

import { appRouter, createContext } from '../../../server/router';

// Handle incoming tRPC requests
export default createNextApiHandler({
  router: appRouter,
  createContext,
});
