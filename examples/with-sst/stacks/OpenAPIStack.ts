import { Api, Config, StackContext, use } from '@serverless-stack/resources';

import { DataStack } from './DataStack';

export function OpenAPIStack({ stack }: StackContext) {
  const { table, TABLE_NAME } = use(DataStack);

  // Send all traffic to the openapi lambda function
  // except requests for the schema, which are handled separately
  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        config: [TABLE_NAME],
        permissions: [table],
      },
    },
    routes: {
      'GET /schema': 'functions/lambda.schema',
      'GET /{proxy+}': 'functions/lambda.openapi',
      'POST /{proxy+}': 'functions/lambda.openapi',
      'PUT /{proxy+}': 'functions/lambda.openapi',
      'DELETE /{proxy+}': 'functions/lambda.openapi',
    },
  });

  // Create a config for the openapi url for use in other stacks
  const OPEN_API_URL = new Config.Parameter(stack, 'OPEN_API_URL', {
    value: api.url,
  });

  stack.addOutputs({
    OpenAPIUrl: api.url,
  });

  return { OPEN_API_URL };
}
