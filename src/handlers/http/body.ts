import bodyParser from 'body-parser';
import { IncomingMessage } from 'http';

export const getBody = async (req: IncomingMessage): Promise<any> => {
  await new Promise<void>((resolve) => bodyParser.json()(req, {} as any, () => resolve()));
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (req as any).body;
};
