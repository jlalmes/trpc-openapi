import { Api, Config, StackContext, use } from '@serverless-stack/resources';

import { DataStack } from './DataStack';

export function tRPCStack({ stack }: StackContext) {
  const { table, TABLE_NAME } = use(DataStack);

  // Send both GET and POST requests to the tRPC lambda function
  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        config: [TABLE_NAME],
        permissions: [table],
      },
    },
    routes: {
      'GET /{proxy+}': 'functions/lambda.trpc',
      'POST /{proxy+}': 'functions/lambda.trpc',
    },
  });

  // Create a config for the tRPC url for use in other stacks
  const tRPC_URL = new Config.Parameter(stack, 'TRPC_URL', {
    value: api.url,
  });

  stack.addOutputs({
    TrpcUrl: api.url,
  });

  return { tRPC_URL };
}
