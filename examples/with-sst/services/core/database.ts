import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Config } from '@serverless-stack/node/config';
import { Entity, EntityItem } from 'electrodb';
import { v4 as uuid } from 'uuid';

export const client = new DynamoDBClient({
  region: 'us-east-1',
});

const TABLE_NAME = Config.TABLE_NAME;

export const UserEntity = new Entity(
  {
    model: {
      version: '1',
      entity: 'user',
      service: 'example',
    },
    attributes: {
      id: { type: 'string', required: true, default: () => uuid() },
      name: { type: 'string', required: true },
      email: { type: 'string', required: true },
      passcode: { type: 'string', required: true },
    },
    indexes: {
      primary: {
        pk: {
          field: 'PK',
          composite: ['id'],
        },
        sk: {
          field: 'SK',
          composite: [],
        },
      },
      email: {
        index: 'GSI1',
        pk: {
          field: 'GSI1PK',
          composite: ['email'],
        },
        sk: {
          field: 'GSI1SK',
          composite: [],
        },
      },
    },
  },
  {
    table: TABLE_NAME,
    client,
  },
);

export type User = EntityItem<typeof UserEntity>;

export const PostEntity = new Entity(
  {
    model: {
      version: '1',
      entity: 'post',
      service: 'example',
    },
    attributes: {
      id: { type: 'string', required: true, default: () => uuid() },
      content: { type: 'string', required: true },
      userId: { type: 'string', required: true },
    },
    indexes: {
      primary: {
        pk: {
          field: 'PK',
          composite: ['id'],
        },
        sk: {
          field: 'SK',
          composite: [],
        },
      },
      user: {
        index: 'GSI1',
        pk: {
          field: 'GSI1PK',
          composite: ['userId'],
        },
        sk: {
          field: 'GSI1SK',
          composite: ['id'],
        },
      },
    },
  },
  {
    table: TABLE_NAME,
    client,
  },
);

export type Post = EntityItem<typeof PostEntity>;
