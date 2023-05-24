import { TRPCError } from '@trpc/server';

export const TRPC_ERROR_CODE_HTTP_STATUS: Record<TRPCError['code'], number> = {
  PARSE_ERROR: 400,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TIMEOUT: 408,
  CONFLICT: 409,
  CLIENT_CLOSED_REQUEST: 499,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  METHOD_NOT_SUPPORTED: 405,
  TOO_MANY_REQUESTS: 429,
  UNPROCESSABLE_CONTENT: 422,
};

export function getErrorFromUnknown(cause: unknown): TRPCError {
  if (cause instanceof Error && cause.name === 'TRPCError') {
    return cause as TRPCError;
  }

  let errorCause: Error | undefined = undefined;
  let stack: string | undefined = undefined;

  if (cause instanceof Error) {
    errorCause = cause;
    stack = cause.stack;
  }

  const error = new TRPCError({
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
    cause: errorCause,
  });

  if (stack) {
    error.stack = stack;
  }

  return error;
}
