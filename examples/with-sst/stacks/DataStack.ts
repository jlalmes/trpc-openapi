import { Config, Script, StackContext, Table } from '@serverless-stack/resources';

export function DataStack({ stack }: StackContext) {
  // Create a table to hold our users and posts
  const table = new Table(stack, 'table', {
    fields: {
      PK: 'string',
      SK: 'string',
      GSI1PK: 'string',
      GSI1SK: 'string',
    },
    primaryIndex: { partitionKey: 'PK', sortKey: 'SK' },
    globalIndexes: {
      GSI1: { partitionKey: 'GSI1PK', sortKey: 'GSI1SK' },
    },
  });

  const TABLE_NAME = new Config.Parameter(stack, 'TABLE_NAME', {
    value: table.tableName,
  });

  // If we are not on prod lets seed the table for funsies
  if (stack.stage !== 'prod') {
    new Script(stack, 'Script', {
      defaults: {
        function: {
          permissions: [table],
          config: [TABLE_NAME],
        },
      },
      onCreate: 'functions/seed.main',
    });
  }

  stack.addOutputs({
    TableName: table.tableName,
  });

  return { table, TABLE_NAME };
}
