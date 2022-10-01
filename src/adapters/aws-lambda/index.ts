import { TRPCError } from '@trpc/server';
import type { CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import type { NodeHTTPRequest } from '@trpc/server/dist/adapters/node-http';
import type { Context as APIGWContext } from 'aws-lambda';
import { EventEmitter } from 'events';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Body, RequestMethod } from 'node-mocks-http';
import { createRequest, createResponse } from 'node-mocks-http';

import type { OpenApiRouter } from '../../types';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from '../node-http/core';
import {
  APIGatewayEvent,
  APIGatewayResult,
  UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
  isPayloadV1,
  isPayloadV2,
} from './utils';

type AWSLambdaCreateContextFn<TRouter extends OpenApiRouter, TEvent extends APIGatewayEvent> = ({
  event,
  context,
}: CreateAWSLambdaContextOptions<TEvent>) =>
  | TRouter['_def']['_ctx']
  | Promise<TRouter['_def']['_ctx']>;

type CreateOpenAwsLambdaHandlerOptions<
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

/**
 * COPIED FROM
 * https://github.com/trpc/trpc/blob/next/packages/server/src/adapters/aws-lambda/
 * It would be best if we could just import these from the trpc server package
 */

function getHTTPMethod(event: APIGatewayEvent) {
  if (isPayloadV1(event)) {
    return event.httpMethod;
  }
  if (isPayloadV2(event)) {
    return event.requestContext.http.method;
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
  });
}

function getPath(event: APIGatewayEvent) {
  if (isPayloadV1(event)) {
    const matches = event.resource.matchAll(/\{(.*?)\}/g);
    for (const match of matches) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const group = match[1]!;
      if (group.includes('+') && event.pathParameters) {
        return event.pathParameters[group.replace('+', '')] || '';
      }
    }
    return event.path.slice(1);
  }
  if (isPayloadV2(event)) {
    const matches = event.routeKey.matchAll(/\{(.*?)\}/g);
    for (const match of matches) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const group = match[1]!;
      if (group.includes('+') && event.pathParameters) {
        return event.pathParameters[group.replace('+', '')] || '';
      }
    }
    return event.rawPath.slice(1);
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
  });
}

function transformHeaders(
  headers: Record<string, string | string[] | undefined>,
): APIGatewayResult['headers'] {
  const obj: APIGatewayResult['headers'] = {};

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'undefined') {
      continue;
    }
    obj[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return obj;
}

// end https://github.com/trpc/trpc/blob/next/packages/server/src/adapters/aws-lambda/

/* -------------------------------------------------------------------------- */
/*                          Mock Request and Response                         */
/* -------------------------------------------------------------------------- */
function createRequestFromEvent(event: APIGatewayEvent): NodeHTTPRequest {
  const url = `https://${event.requestContext.domainName || ''}/${getPath(event)}`;

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
  opts: CreateOpenAwsLambdaHandlerOptions<TRouter, TEvent>,
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

    // Should we handle this for people or just let it throw errors?
    // Chrome automatically checks for this so it maybe best to do this
    // automatically so folks testing GETs in the browser don't have to deal with errors
    if (_req.url?.match(/favicon\.ico$/)) return { statusCode: 404 };

    await openAwsLambdaHandler(_req, _res);
    return createLambdaResponse(event, _res);
  };
};
