/* eslint-disable @typescript-eslint/no-unsafe-return */
import bodyParser from 'body-parser';
import { IncomingMessage } from 'http';

export const getBody = async (req: IncomingMessage, maxBodySize?: number): Promise<any> => {
  if ('body' in req) {
    return (req as any).body;
  }
  await new Promise<void>((resolve) => {
    bodyParser.json({ strict: false, limit: maxBodySize })(req, {} as any, () => resolve());
  });
  return (req as any).body;
};
