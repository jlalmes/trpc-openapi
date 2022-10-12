import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda';
import { createOpenApiAwsLambdaHandler } from 'trpc-openapi';

import { openApiDocument } from './src/openapi';
import { appRouter, createContext } from './src/router';

// Handle incoming tRPC requests
export const trpcHandler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
});

// Handle incoming OpenAPI requests
export const trpcOpenApiHandler = createOpenApiAwsLambdaHandler({
  router: appRouter,
  createContext,
});

// Serve our OpenAPI schema
// eslint-disable-next-line @typescript-eslint/require-await
export const openApiJson = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(openApiDocument),
  };
};
