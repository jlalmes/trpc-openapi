import { IncomingMessage } from 'http';

export const getBody = (req: IncomingMessage) => {
  if ('body' in req) {
    return req.body;
  }
  const body = '';
};
