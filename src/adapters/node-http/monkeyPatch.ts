import { z } from 'zod';

import { OpenApiProcedureRecord, OpenApiRouter } from '../../types';
import { forEachOpenApiProcedure, getInputOutputParsers } from '../../utils/procedure';
import { instanceofZodType, instanceofZodTypeLikeVoid } from '../../utils/zod';

export const monkeyPatchVoidInputs = (appRouter: OpenApiRouter) => {
  const { queries, mutations } = appRouter._def;
  const zObject = z.object({});

  const voidInputPatcher = (procedure: OpenApiProcedureRecord[string]) => {
    const { inputParser } = getInputOutputParsers(procedure);
    if (instanceofZodType(inputParser) && instanceofZodTypeLikeVoid(inputParser)) {
      (procedure as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
  };

  forEachOpenApiProcedure(queries, ({ procedure }) => voidInputPatcher(procedure));
  forEachOpenApiProcedure(mutations, ({ procedure }) => voidInputPatcher(procedure));
};
