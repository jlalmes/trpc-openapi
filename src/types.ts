import { ProcedureRecord } from '@trpc/server';
// eslint-disable-next-line import/no-unresolved
import { DefaultErrorShape, Router } from '@trpc/server/dist/declarations/src/router';
// eslint-disable-next-line import/no-unresolved
import { TRPC_ERROR_CODE_KEY } from '@trpc/server/dist/declarations/src/rpc';
import { z } from 'zod';

export type OpenApiMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type OpenApiMeta<TMeta = Record<string, any>> = TMeta & {
  openapi?: {
    enabled: boolean;
    method: OpenApiMethod;
    path: `/${string}`;
    summary?: string;
    description?: string;
    protect?: boolean;
    tag?: string;
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
    code: TRPC_ERROR_CODE_KEY;
    issues?: z.ZodIssue[];
  };
};

export type OpenApiResponse<D = any> = OpenApiSuccessResponse<D> | OpenApiErrorResponse;

export type ZodParameterTypeLikeVoid = z.ZodVoid | z.ZodUndefined | z.ZodNever;

type NativeEnumType = {
  [k: string]: string | number;
  [nu: number]: string;
};

export type ZodParameterTypeLikeString =
  | z.ZodString
  | z.ZodLiteral<string>
  | z.ZodEnum<[string, ...string[]]>
  | z.ZodNativeEnum<NativeEnumType>
  | z.ZodOptional<ZodParameterTypeLikeString>
  | z.ZodDefault<ZodParameterTypeLikeString>
  | z.ZodEffects<ZodParameterTypeLikeString, unknown, unknown>
  | z.ZodUnion<[ZodParameterTypeLikeString, ...ZodParameterTypeLikeString[]]>
  | z.ZodIntersection<ZodParameterTypeLikeString, ZodParameterTypeLikeString>
  | z.ZodLazy<ZodParameterTypeLikeString>;

export type ZodParameterTypeLikeNumber =
  | z.ZodNumber
  | z.ZodLiteral<number>
  | z.ZodNativeEnum<NativeEnumType>
  | z.ZodOptional<ZodParameterTypeLikeNumber>
  | z.ZodDefault<ZodParameterTypeLikeNumber>
  | z.ZodEffects<ZodParameterTypeLikeNumber, unknown, unknown>
  | z.ZodUnion<[ZodParameterTypeLikeNumber, ...ZodParameterTypeLikeNumber[]]>
  | z.ZodIntersection<ZodParameterTypeLikeNumber, ZodParameterTypeLikeNumber>
  | z.ZodLazy<ZodParameterTypeLikeNumber>;

export type ZodParameterTypeLikeBoolean =
  | z.ZodBoolean
  | z.ZodLiteral<boolean>
  | z.ZodOptional<ZodParameterTypeLikeBoolean>
  | z.ZodDefault<ZodParameterTypeLikeBoolean>
  | z.ZodEffects<ZodParameterTypeLikeBoolean, unknown, unknown>
  | z.ZodUnion<[ZodParameterTypeLikeBoolean, ...ZodParameterTypeLikeBoolean[]]>
  | z.ZodIntersection<ZodParameterTypeLikeBoolean, ZodParameterTypeLikeBoolean>
  | z.ZodLazy<ZodParameterTypeLikeBoolean>;

export type ZodParameterTypeLikeDate =
  | z.ZodDate
  | z.ZodOptional<ZodParameterTypeLikeDate>
  | z.ZodDefault<ZodParameterTypeLikeDate>
  | z.ZodEffects<ZodParameterTypeLikeDate, unknown, unknown>
  | z.ZodUnion<[ZodParameterTypeLikeDate, ...ZodParameterTypeLikeDate[]]>
  | z.ZodIntersection<ZodParameterTypeLikeDate, ZodParameterTypeLikeDate>
  | z.ZodLazy<ZodParameterTypeLikeDate>;

export type ZodParameterType =
  | ZodParameterTypeLikeString
  | ZodParameterTypeLikeNumber
  | ZodParameterTypeLikeBoolean
  | ZodParameterTypeLikeDate;
