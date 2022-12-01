import { TRPCError } from '@trpc/server';
import { NodeHTTPRequest } from '@trpc/server/dist/adapters/node-http';

// taken straight from trpc sauce
function getPostBody(opts: { req: NodeHTTPRequest; maxBodySize?: number }) {
  const { req, maxBodySize = Infinity } = opts;
  return new Promise<{ ok: true; data: unknown } | { ok: false; error: TRPCError }>((resolve) => {
    if (req.body !== undefined) {
      resolve({ ok: true, data: req.body });
      return;
    }
    let body = '';
    let hasBody = false;
    req.on('data', function (data) {
      body += data;
      hasBody = true;
      if (body.length > maxBodySize) {
        resolve({
          ok: false,
          error: new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: 'Payload too large' }),
        });
      }
    });
    req.on('end', () => {
      resolve({
        ok: true,
        data: hasBody ? body : undefined,
      });
    });
  });
}

async function getPostBodyJSON(opts: { req: NodeHTTPRequest; maxBodySize?: number }) {
  const res = await getPostBody(opts);

  if (!res.ok) {
    throw res.error;
  }

  if (typeof res.data !== 'string') {
    return res.data;
  }

  try {
    return JSON.parse(res.data);
  } catch {
    throw new TRPCError({ code: 'PARSE_ERROR', message: 'Failed to parse request body' });
  }
}

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      req.body = await getPostBodyJSON({ req, maxBodySize });
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'TRPCError') {
        throw cause;
      }

      let errorCause: Error | undefined = undefined;
      if (cause instanceof Error) {
        errorCause = cause;
      }

      throw new TRPCError({
        message: 'Failed to parse request body',
        code: 'PARSE_ERROR',
        cause: errorCause,
      });
    }
  }

  return req.body;
};
