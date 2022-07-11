import { z } from 'zod';

import { OpenApiRouter } from '../../types';
import {
  getInputOutputParsers,
  getPathParameters,
  instanceofZodTypeLikeBoolean,
  instanceofZodTypeLikeDate,
  instanceofZodTypeLikeNumber,
  instanceofZodTypeLikeVoid,
  instanceofZodTypeObject,
  normalizePath,
} from '../../utils';

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
    if (instanceofZodTypeLikeVoid(inputParser)) {
      (query as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
  }

  for (const mutationPath of Object.keys(mutations)) {
    const mutation = mutations[mutationPath]!;
    const { openapi } = mutation.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }

    const { inputParser } = getInputOutputParsers(mutation);
    if (instanceofZodTypeLikeVoid(inputParser)) {
      (mutation as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
  }
};

export const monkeyPatchParameterInputs = (appRouter: OpenApiRouter) => {
  const { queries, mutations } = appRouter._def;

  const zNumber = (schema: z.ZodType) =>
    z.preprocess((arg) => {
      if (typeof arg === 'string') return parseInt(arg);
      return arg;
    }, schema);
  const zBoolean = (schema: z.ZodType) =>
    z.preprocess((arg) => {
      if (typeof arg === 'string') {
        if (arg === 'true' || arg === '1') return true;
        if (arg === 'false' || arg === '0') return false;
      }
      return arg;
    }, schema);
  const zDate = (schema: z.ZodType) =>
    z.preprocess((arg) => {
      if (typeof arg === 'string') return new Date(arg);
      return arg;
    }, schema);

  for (const queryPath of Object.keys(queries)) {
    const query = queries[queryPath]!;
    const { openapi } = query.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }

    const { inputParser } = getInputOutputParsers(query);
    if (instanceofZodTypeObject(inputParser)) {
      const shape = inputParser.shape;
      const shapeKeys = Object.keys(shape);
      let zObject: z.AnyZodObject = inputParser;
      shapeKeys.forEach((shapeKey) => {
        const shapeSchema = shape[shapeKey]!;
        if (instanceofZodTypeLikeNumber(shapeSchema)) {
          zObject = zObject.merge(z.object({ [shapeKey]: zNumber(shapeSchema) }));
          return;
        }
        if (instanceofZodTypeLikeBoolean(shapeSchema)) {
          zObject = zObject.merge(z.object({ [shapeKey]: zBoolean(shapeSchema) }));
          return;
        }
        if (instanceofZodTypeLikeDate(shapeSchema)) {
          zObject = zObject.merge(z.object({ [shapeKey]: zDate(shapeSchema) }));
          return;
        }
      });
      (query as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
  }

  for (const mutationPath of Object.keys(mutations)) {
    const mutation = mutations[mutationPath]!;
    const { openapi } = mutation.meta ?? {};
    if (!openapi?.enabled) {
      continue;
    }

    const path = normalizePath(openapi.path);
    const pathParameters = getPathParameters(path);
    if (pathParameters.length === 0) {
      continue;
    }

    const { inputParser } = getInputOutputParsers(mutation);
    if (instanceofZodTypeObject(inputParser)) {
      const shape = inputParser.shape;
      const shapeKeys = Object.keys(shape);
      let zObject: z.AnyZodObject = inputParser;
      shapeKeys.forEach((shapeKey) => {
        const isPathParameter = pathParameters.includes(shapeKey);
        if (!isPathParameter) {
          return;
        }

        const shapeSchema = shape[shapeKey]!;
        if (instanceofZodTypeLikeNumber(shapeSchema)) {
          zObject = zObject.merge(z.object({ [shapeKey]: zNumber(shapeSchema) }));
          return;
        }
        if (instanceofZodTypeLikeBoolean(shapeSchema)) {
          zObject = zObject.merge(z.object({ [shapeKey]: zBoolean(shapeSchema) }));
          return;
        }
        if (instanceofZodTypeLikeDate(shapeSchema)) {
          zObject = zObject.merge(z.object({ [shapeKey]: zDate(shapeSchema) }));
          return;
        }
      });
      (mutation as any).parseInputFn = zObject.parseAsync.bind(zObject);
    }
  }
};
