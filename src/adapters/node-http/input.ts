import { TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { NodeHTTPRequest } from '@trpc/server/dist/declarations/src/adapters/node-http';
import parse from 'co-body';

export const getQuery = (req: NodeHTTPRequest, url: URL): Record<string, string> => {
  const query: Record<string, string> = {};

  if (!req.query) {
    const parsedQs: Record<string, string[]> = {};
    url.searchParams.forEach((value, key) => {
      if (!parsedQs[key]) {
        parsedQs[key] = [];
      }
      parsedQs[key]!.push(value);
    });
    req.query = parsedQs;
  }

  // normalize first value in array
  Object.keys(req.query).forEach((key) => {
    const value = req.query![key];
    if (value) {
      if (typeof value === 'string') {
        query[key] = value;
      } else if (Array.isArray(value)) {
        if (typeof value[0] === 'string') {
          query[key] = value[0];
        }
      }
    }
  });

  return query;
};

const BODY_100_KB = 100000;
export const getBody = async (req: NodeHTTPRequest, maxBodySize = BODY_100_KB): Promise<any> => {
  if ('body' in req) {
    return req.body;
  }

  req.body = undefined;

  if (req.headers['content-type'] === 'application/json') {
    try {
      const { raw, parsed } = await parse.json(req, {
        limit: maxBodySize,
        strict: false,
        returnRawBody: true,
      });
      req.body = raw ? parsed : undefined;
    } catch (error) {
      if (error instanceof Error && error.name === 'PayloadTooLargeError') {
        throw new TRPCError({
          message: 'Request body too large',
          code: 'PAYLOAD_TOO_LARGE',
          cause: error,
        });
      }
      throw new TRPCError({
        message: 'Failed to parse request body',
        code: 'PARSE_ERROR',
        cause: error,
      });
    }
  }

  return req.body;
};
