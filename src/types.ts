import { ProcedureRecord } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { DefaultErrorShape, Router } from '@trpc/server/dist/declarations/src/router';
// eslint-disable-next-line import/no-unresolved
import { TRPC_ERROR_CODE_KEY } from '@trpc/server/dist/declarations/src/rpc';
import { OpenAPIV3 } from 'openapi-types';
import { ZodIssue } from 'zod';

export type OpenApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type TRPCMeta = Record<string, any>;

export type OpenApiMeta<TMeta = TRPCMeta> = TMeta & {
  openapi?: {
    enabled?: boolean;
    method: OpenApiMethod;
    path: `/${string}`;
    summary?: string;
    description?: string;
    protect?: boolean;
    headers?: (OpenAPIV3.ParameterBaseObject & { name: string; in?: 'header' })[];
  } & (
    | {
        tags?: never;
        /** @deprecated Use `tags` instead */
        tag?: string;
      }
    | {
        tags?: string[];
        /** @deprecated Use `tags` instead */
        tag?: never;
      }
  );
};

export type OpenApiProcedureRecord<TMeta = TRPCMeta> = ProcedureRecord<
  any,
  any,
  OpenApiMeta<TMeta> | undefined,
  any,
  any,
  any,
  any
>;

export type OpenApiProcedure<TMeta = TRPCMeta> = OpenApiProcedureRecord<TMeta>[string];

export type OpenApiRouter<TContext = any, TMeta = TRPCMeta> = Router<
  TContext,
  TContext,
  OpenApiMeta<TMeta>,
  OpenApiProcedureRecord<TMeta>,
  OpenApiProcedureRecord<TMeta>,
  ProcedureRecord<any, any, TMeta | undefined, any, any, any, any>,
  DefaultErrorShape
>;

export type OpenApiSuccessResponse<D = any> = D;

export type OpenApiErrorResponse = {
  message: string;
  code: TRPC_ERROR_CODE_KEY;
  issues?: ZodIssue[];
};

export type OpenApiResponse<D = any> = OpenApiSuccessResponse<D> | OpenApiErrorResponse;
