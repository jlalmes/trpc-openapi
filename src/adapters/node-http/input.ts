/* eslint-disable @typescript-eslint/no-unsafe-return */
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
  await new Promise<void>((resolve) => {
    bodyParser.json({ strict: false, limit: maxBodySize })(req, {} as any, () => {
      if (!('body' in req)) {
        req.body = {};
      }
      resolve();
    });
  });
  return req.body;
};
