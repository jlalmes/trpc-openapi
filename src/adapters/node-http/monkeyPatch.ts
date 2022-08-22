import { z } from 'zod';

import { OpenApiProcedure } from '../../types';
import { getInputOutputParsers } from '../../utils/procedure';
import { instanceofZodType, instanceofZodTypeLikeVoid } from '../../utils/zod';

export const monkeyPatchProcedure = (procedure: OpenApiProcedure) => {
  if ((procedure as any).__monkeyPatched) return;
  (procedure as any).__monkeyPatched = true;

  const { inputParser } = getInputOutputParsers(procedure);
  if (instanceofZodType(inputParser)) {
    if (instanceofZodTypeLikeVoid(inputParser)) {
      const zObject = z.object({});
      (procedure as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
    // TODO: add out of box support for number/boolean/date etc.
  }
};
