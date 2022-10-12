import { TRPCError } from '@trpc/server';
import {
  APIGatewayEvent,
  AWSLambdaOptions,
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
import type { Body, RequestMethod } from 'node-mocks-http';
import { createRequest, createResponse } from 'node-mocks-http';

import type { OpenApiRouter } from '../types';
import { createOpenApiNodeHttpHandler } from './node-http/core';

export type CreateOpenApiAwsLambdaHandlerOptions<
  TRouter extends OpenApiRouter,
  TEvent extends APIGatewayEvent,
> = Pick<
  AWSLambdaOptions<TRouter, TEvent>,
  'router' | 'createContext' | 'responseMeta' | 'onError'
>;

const createMockNodeHTTPRequest = (event: APIGatewayEvent): NodeHTTPRequest => {
  const path = getPath(event);
  const url = event.requestContext.domainName
    ? `https://${event.requestContext.domainName}/${getPath(event)}`
    : path[0] === '/'
    ? path
    : `/${path}`;

  const method = getHTTPMethod(event).toUpperCase() as RequestMethod;
  const body = typeof event.body === 'string' ? (JSON.parse(event.body) as Body) : undefined;

  return createRequest({
    url,
    method,
    query: event.queryStringParameters || undefined,
    headers: event.headers,
    body,
  });
};

const createMockNodeHTTPResponse = () => {
  return createResponse({ eventEmitter: EventEmitter });
};

export const createOpenApiAwsLambdaHandler = <
  TRouter extends OpenApiRouter,
  TEvent extends APIGatewayEvent,
>(
  opts: CreateOpenApiAwsLambdaHandlerOptions<TRouter, TEvent>,
) => {
  return async (event: TEvent, context: APIGWContext) => {
    const createContext = async () => opts.createContext?.({ event, context });
    const openApiHttpHandler = createOpenApiNodeHttpHandler({ ...opts, createContext } as any);

    const req = createMockNodeHTTPRequest(event);
    const res = createMockNodeHTTPResponse();

    await openApiHttpHandler(req, res);

    if (isPayloadV1(event) || isPayloadV2(event)) {
      return {
        statusCode: res.statusCode,
        headers: transformHeaders(res._getHeaders() || {}),
        body: res._getData(),
      };
    } else {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: UNKNOWN_PAYLOAD_FORMAT_VERSION_ERROR_MESSAGE,
      });
    }
  };
};
