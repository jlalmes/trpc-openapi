import { Procedure, ProcedureParams, Router, RouterDef } from '@trpc/server';
import { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc';
import { OpenAPIV3 } from 'openapi-types';
import { ZodIssue } from 'zod';

export type OpenApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type TRPCMeta = Record<string, unknown>;

export type OpenApiMeta<TMeta = TRPCMeta> = TMeta & {
  openapi?: {
    enabled?: boolean;
    method: OpenApiMethod;
    path: `/${string}`;
    summary?: string;
    description?: string;
    protect?: boolean;
    tags?: string[];
    headers?: (OpenAPIV3.ParameterBaseObject & { name: string; in?: 'header' })[];
  };
};

export type OpenApiProcedure<TMeta = TRPCMeta> = Procedure<
  'query' | 'mutation',
  ProcedureParams<
    {
      transformer: any;
      errorShape: any;
      ctx: any;
      meta: OpenApiMeta<TMeta>;
    },
    any,
    any,
    any,
    any,
    any,
    any,
    OpenApiMeta<TMeta>
  >
>;

export type OpenApiProcedureRecord<TMeta = TRPCMeta> = Record<string, OpenApiProcedure<TMeta>>;

export type OpenApiRouter<TMeta = TRPCMeta> = Router<RouterDef<any, any, OpenApiMeta<TMeta>, any>>;

export type OpenApiSuccessResponse<D = any> = D;

export type OpenApiErrorResponse = {
  message: string;
  code: TRPC_ERROR_CODE_KEY;
  issues?: ZodIssue[];
};

export type OpenApiResponse<D = any> = OpenApiSuccessResponse<D> | OpenApiErrorResponse;
