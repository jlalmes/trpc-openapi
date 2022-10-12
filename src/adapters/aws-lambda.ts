import { TRPCError } from '@trpc/server';
import {
  APIGatewayEvent,
  APIGatewayResult,
  CreateAWSLambdaContextOptions,
  UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
  getHTTPMethod,
  getPath,
  isPayloadV1,
  isPayloadV2,
  transformHeaders,
} from '@trpc/server/adapters/aws-lambda';
import type { NodeHTTPRequest } from '@trpc/server/dist/adapters/node-http';
import type { Context as APIGWContext } from 'aws-lambda';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Body, RequestMethod } from 'node-mocks-http';
import { createRequest, createResponse } from 'node-mocks-http';

import type { OpenApiRouter } from '../types';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from './node-http/core';

type AWSLambdaCreateContextFn<TRouter extends OpenApiRouter, TEvent extends APIGatewayEvent> = ({
  event,
  context,
}: CreateAWSLambdaContextOptions<TEvent>) =>
  | TRouter['_def']['_config']['$types']['ctx']
  | Promise<TRouter['_def']['_config']['$types']['ctx']>;

export type CreateOpenApiAwsLambdaHandlerOptions<
  TRouter extends OpenApiRouter,
  TEvent extends APIGatewayEvent,
> = Omit<
  CreateOpenApiNodeHttpHandlerOptions<TRouter, IncomingMessage, ServerResponse>,
  'createContext'
> &
  (
    | {
        /**
         * @link https://trpc.io/docs/context
         **/
        createContext: AWSLambdaCreateContextFn<TRouter, TEvent>;
      }
    | {
        /**
         * @link https://trpc.io/docs/context
         **/
        createContext?: AWSLambdaCreateContextFn<TRouter, TEvent>;
      }
  );

/* -------------------------------------------------------------------------- */
/*                          Mock Request and Response                         */
/* -------------------------------------------------------------------------- */
function createRequestFromEvent(event: APIGatewayEvent): NodeHTTPRequest {
  const path = getPath(event);
  const url = event.requestContext.domainName
    ? `https://${event.requestContext.domainName}/${getPath(event)}`
    : path[0] === '/'
    ? path
    : `/${path}`;

  const method = getHTTPMethod(event).toUpperCase() as RequestMethod;
  const req = createRequest({
    url,
    method,
    query: event.queryStringParameters || undefined,
    body: event.body ? (JSON.parse(event.body) as Body) : undefined,
    headers: event.headers,
  });
  return req;
}

function createLambdaResponse<TEvent extends APIGatewayEvent, TResult extends APIGatewayResult>(
  event: TEvent,
  response: ReturnType<typeof createResponse>,
): TResult {
  const resp = {
    statusCode: response.statusCode,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    body: response._getData() ?? '',
    headers: transformHeaders(response._getHeaders() || {}),
  };

  if (isPayloadV1(event)) {
    return resp as TResult;
  } else if (isPayloadV2(event)) {
    return resp as TResult;
  } else {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
    });
  }
}

export const createOpenApiAwsLambdaHandler = <
  TRouter extends OpenApiRouter,
  TEvent extends APIGatewayEvent,
>(
  opts: CreateOpenApiAwsLambdaHandlerOptions<TRouter, TEvent>,
) => {
  return async (event: TEvent, context: APIGWContext) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const createContext = async () => opts.createContext?.({ event, context });
    const openAwsLambdaHandler = createOpenApiNodeHttpHandler({
      ...opts,
      createContext,
    });
    const _req = createRequestFromEvent(event);
    const _res = createResponse({
      eventEmitter: EventEmitter,
    });

    await openAwsLambdaHandler(_req, _res);
    return createLambdaResponse(event, _res);
  };
};
