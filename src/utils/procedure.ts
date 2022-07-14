// eslint-disable-next-line import/no-unresolved
import { Procedure, ProcedureParser } from '@trpc/server/dist/declarations/src/internals/procedure';

import { OpenApiMeta, OpenApiProcedureRecord } from '../types';

// `inputParser` & `outputParser` are private so this is a hack to access it
export const getInputOutputParsers = (procedure: Procedure<any, any, any, any, any, any, any>) => {
  return procedure as unknown as {
    inputParser: ProcedureParser<any>;
    outputParser: ProcedureParser<any>;
  };
};

export const forEachOpenApiProcedure = (
  procedureRecord: OpenApiProcedureRecord,
  callback: (values: {
    path: string;
    procedure: OpenApiProcedureRecord[string];
    openapi: NonNullable<OpenApiMeta['openapi']>;
  }) => void,
) => {
  for (const [path, procedure] of Object.entries(procedureRecord)) {
    const { openapi } = procedure.meta ?? {};
    if (openapi?.enabled) {
      callback({ path, procedure, openapi });
    }
  }
};
