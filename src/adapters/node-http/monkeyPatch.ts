import { z } from 'zod';

import { OpenApiRouter } from '../../types';
import { getInputOutputParsers, instanceofZodTypeKind } from '../../utils';

export const monkeyPatchVoidInputs = (appRouter: OpenApiRouter) => {
  const { queries, mutations } = appRouter._def;
  const zObject = z.object({});

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }

    const { inputParser } = getInputOutputParsers(query);
    if (
      instanceofZodTypeKind(inputParser, z.ZodFirstPartyTypeKind.ZodVoid) ||
      instanceofZodTypeKind(inputParser, z.ZodFirstPartyTypeKind.ZodUndefined) ||
      instanceofZodTypeKind(inputParser, z.ZodFirstPartyTypeKind.ZodNever)
    ) {
      (appRouter._def.queries[queryPath] as any).parseInputFn = zObject.parse.bind(zObject);
    }
  }

  for (const mutationPath of Object.keys(mutations)) {
    const mutation = mutations[mutationPath]!;
    const { openapi } = mutation.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }

    const { inputParser } = getInputOutputParsers(mutation);
    if (
      instanceofZodTypeKind(inputParser, z.ZodFirstPartyTypeKind.ZodVoid) ||
      instanceofZodTypeKind(inputParser, z.ZodFirstPartyTypeKind.ZodUndefined) ||
      instanceofZodTypeKind(inputParser, z.ZodFirstPartyTypeKind.ZodNever)
    ) {
      (appRouter._def.mutations[mutationPath] as any).parseInputFn = zObject.parse.bind(zObject);
    }
  }
};
