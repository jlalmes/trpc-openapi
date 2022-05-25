/* eslint-disable @typescript-eslint/no-unsafe-return */
import { TRPCError } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { NodeHTTPRequest } from '@trpc/server/dist/declarations/src/adapters/node-http';
import bodyParser from 'body-parser';

export const getQuery = (req: NodeHTTPRequest, url: URL): any => {
  if ('query' in req) {
    return req.query;
  }
  req.query = Object.fromEntries(url.searchParams.entries());
  return req.query;
};

export const getBody = async (req: NodeHTTPRequest, maxBodySize?: number): Promise<any> => {
  if ('body' in req) {
    return req.body;
  }
  await new Promise<void>((resolve, reject) => {
    bodyParser.json({ strict: false, limit: maxBodySize ?? 102400 })(req, {} as any, (error) => {
      if (error instanceof Error) {
        if (error.name === 'PayloadTooLargeError') {
          reject(
            new TRPCError({
              message: 'Request body too large',
              code: 'PAYLOAD_TOO_LARGE',
              cause: error,
            }),
          );
        }
        reject(
          new TRPCError({
            message: 'Failed to parse request body',
            code: 'PARSE_ERROR',
            cause: error,
          }),
        );
        return;
      }
      if (!('body' in req)) {
        req.body = {};
      }
      resolve();
    });
  });
  return req.body;
};