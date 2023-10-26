import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';

import { zodSchemaToOpenApiSchemaObject } from '../generator/schema';
import { ZodToOpenApiRegistry } from '../types';

export let zodComponentRegistry: ZodToOpenApiRegistry | undefined;

export let zodComponentDefinitions: Record<string, z.ZodType> | undefined;

export let zodComponentGenerator:
  | ((registry: ZodToOpenApiRegistry) => {
      [key: string]: any;
    })
  | 'built-in'
  | 'none' = 'none';

export const setZodComponentDefinitions = (definitions: Record<string, z.ZodType>) => {
  zodComponentDefinitions = definitions;
};

export const setZodComponentRegistry = (registry: ZodToOpenApiRegistry) => {
  zodComponentRegistry = registry;

  const mapped = registry.definitions.reduce((acc, d) => {
    const refId = d.schema?._def.openapi?._internal?.refId;
    if (d.type === 'schema' && refId && d.schema) {
      acc[refId] = d.schema;
    }
    return acc;
  }, {} as { [key: string]: z.ZodType });

  setZodComponentDefinitions(mapped);
};

export const setZodComponentGenerator = (generator: typeof zodComponentGenerator) => {
  zodComponentGenerator = generator;
};

export const builtInZodComponentGenerator = (): { [key: string]: OpenAPIV3.SchemaObject } => {
  return zodComponentDefinitions
    ? Object.fromEntries(
        Object.entries(zodComponentDefinitions).map(([key, value]) => [
          key,
          zodSchemaToOpenApiSchemaObject(value, true),
        ]),
      )
    : {};
};
