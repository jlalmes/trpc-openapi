import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';

import { zodSchemaToOpenApiSchemaObject } from '../generator/schema';

type ZodComponentProcessor = {
  getComponentRefId: (schema: z.ZodType) => string | undefined;
  generateSchemas?: () => { [key: string]: any };
};

export let zodComponentProcessor: ZodComponentProcessor | undefined = undefined;

export let zodComponentDefinitions: Record<string, z.ZodType> | undefined;

export const setZodComponentDefinitions = (definitions: Record<string, z.ZodType>) => {
  zodComponentDefinitions = definitions;
};

export const setZodComponentProcessor = (processor: ZodComponentProcessor) => {
  zodComponentProcessor = processor;
};

// Does not support references (breaks in weird ways if references are used)
export const experimentalZodSchemaGenerator = (): { [key: string]: OpenAPIV3.SchemaObject } => {
  return zodComponentDefinitions
    ? Object.fromEntries(
        Object.entries(zodComponentDefinitions).map(([key, value]) => [
          key,
          zodSchemaToOpenApiSchemaObject(value, true),
        ]),
      )
    : {};
};
