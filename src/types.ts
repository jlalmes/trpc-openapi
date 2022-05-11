import { ProcedureRecord } from '@trpc/server';
// TODO: Import from @trpc/server after migrating to v10
// eslint-disable-next-line import/no-unresolved
import { Router } from '@trpc/server/dist/declarations/src/router';

export type OpenAPIMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type OpenAPIMeta<TMeta extends Record<string, any> = Record<string, any>> = TMeta & {
  openapi?: {
    enabled: boolean;
    method?: OpenAPIMethod;
    tags?: string[];
    description?: string;
    isProtected?: boolean;
  };
};

export type OpenAPIProcedureRecord = ProcedureRecord<
  any,
  any,
  OpenAPIMeta | undefined,
  any,
  any,
  any,
  any
>;

export type OpenAPIProcedure = OpenAPIProcedureRecord[string];

export type OpenAPIRouter = Router<
  any,
  any,
  OpenAPIMeta,
  OpenAPIProcedureRecord,
  OpenAPIProcedureRecord,
  any,
  any
>;
