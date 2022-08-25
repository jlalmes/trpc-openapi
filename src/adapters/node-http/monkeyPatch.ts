import { z } from 'zod';

import { OpenApiProcedure } from '../../types';
import { getInputOutputParsers } from '../../utils/procedure';
import { instanceofZodType, instanceofZodTypeLikeVoid } from '../../utils/zod';

type MonkeyPatchedOpenApiProcedure = OpenApiProcedure & { __MONKEY_PATCHED__?: boolean };

export const monkeyPatchProcedure = (procedure: MonkeyPatchedOpenApiProcedure) => {
  if (procedure.__MONKEY_PATCHED__) return;
  procedure.__MONKEY_PATCHED__ = true;

  const { inputParser } = getInputOutputParsers(procedure);
  if (instanceofZodType(inputParser)) {
    if (instanceofZodTypeLikeVoid(inputParser)) {
      const zObject = z.object({});
      (procedure as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
    // TODO: add out of box support for number/boolean/date etc. (https://github.com/jlalmes/trpc-openapi/issues/44)
  }
};
