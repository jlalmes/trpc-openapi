import { awsLambdaRequestHandler } from '@trpc/server/adapters/aws-lambda';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { createOpenApiAwsLambdaHandler } from 'trpc-openapi';

import { openApiDocument } from '../core/openapi';
import { appRouter, createContext } from '../core/router';

// Handle incoming tRPC requests
export const trpc = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
});

// Handle incoming OpenAPI requests
export const openapi = createOpenApiAwsLambdaHandler({
  router: appRouter,
  createContext,
});

// Serve our OpenAPI schema
// eslint-disable-next-line @typescript-eslint/require-await
export const schema: APIGatewayProxyHandlerV2 = async (event) => {
  const {
    requestContext: { domainName },
  } = event;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(openApiDocument(domainName)),
  };
};
