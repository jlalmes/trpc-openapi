import { ProcedureRecord } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { DefaultErrorShape, Router } from '@trpc/server/dist/declarations/src/router';

export type OpenApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type OpenApiMeta<TMeta = Record<string, any>> = TMeta & {
  openapi?: {
    enabled: boolean;
    path: `/${string}`;
    method: OpenApiMethod;
    description?: string;
    tags?: string[];
    secure?: boolean;
  };
};

export type OpenApiRouter<TContext = any, TMeta = Record<string, any>> = Router<
  TContext,
  TContext,
  OpenApiMeta<TMeta>,
  ProcedureRecord<any, any, OpenApiMeta<TMeta> | undefined>,
  ProcedureRecord<any, any, OpenApiMeta<TMeta> | undefined>,
  ProcedureRecord<any, any, TMeta | undefined>,
  DefaultErrorShape
>;

export type OpenApiSuccessResponse<D = any> = {
  ok: true;
  data: D;
};

export type OpenApiErrorResponse = {
  ok: false;
  error: {
    message: string;
    code: string;
    issues?: any[];
  };
};

export type OpenApiResponse<D = any> = OpenApiSuccessResponse<D> | OpenApiErrorResponse;
