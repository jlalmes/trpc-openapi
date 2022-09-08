import { Procedure, Router, RouterDef } from '@trpc/server';
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

export type OpenApiProcedure<TMeta = TRPCMeta> = Procedure<{
  _config: any;
  _meta: OpenApiMeta<TMeta>;
  _ctx_in: any;
  _ctx_out: any;
  _input_in: any;
  _input_out: any;
  _output_in: any;
  _output_out: any;
}>;

export type OpenApiProcedureRecord<TMeta = TRPCMeta> = Record<string, OpenApiProcedure<TMeta>>;

export type OpenApiRouter<TMeta = TRPCMeta> = Router<RouterDef<any, any, OpenApiMeta<TMeta>, any>>;

export type OpenApiSuccessResponse<D = any> = D;

export type OpenApiErrorResponse = {
  message: string;
  code: TRPC_ERROR_CODE_KEY;
  issues?: ZodIssue[];
};

export type OpenApiResponse<D = any> = OpenApiSuccessResponse<D> | OpenApiErrorResponse;
