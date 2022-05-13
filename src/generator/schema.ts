import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

const zodSchemaToOpenApiSchemaObject = (zodSchema: z.ZodSchema): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(zodSchema, { target: 'openApi3' });
};

const getRootZodSchema = (zodSchema: z.ZodSchema): z.ZodSchema => {
  if (zodSchema instanceof z.ZodOptional || zodSchema instanceof z.ZodNullable) {
    return getRootZodSchema(zodSchema.unwrap());
  }
  if (zodSchema instanceof z.ZodDefault) {
    return getRootZodSchema(zodSchema.removeDefault());
  }
  if (zodSchema instanceof z.ZodEffects) {
    return getRootZodSchema(zodSchema.innerType());
  }
  return zodSchema;
};

export const getParameterObjects = (zodSchema: any): OpenAPIV3.ParameterObject[] | undefined => {
  if (!(zodSchema instanceof z.ZodObject) && !(zodSchema instanceof z.ZodVoid)) {
    throw new Error('Input parser expects ZodObject or ZodVoid');
  }

  if (zodSchema instanceof z.ZodVoid) {
    return undefined;
  }

  const zodShape = zodSchema.shape as z.ZodRawShape;
  return Object.keys(zodShape).map((zodShapeKey) => {
    const zodShapeValue = zodShape[zodShapeKey]!;

    if (!(getRootZodSchema(zodShapeValue) instanceof z.ZodString)) {
      throw new Error('Input parser expects ZodObject<{ [string]: ZodString }>');
    }

    return {
      name: zodShapeKey,
      in: 'query',
      required: !zodShapeValue.isOptional(),
      schema: zodSchemaToOpenApiSchemaObject(zodShapeValue),
      style: 'form',
      explode: true,
    };
  });
};

export const getRequestBodyObject = (zodSchema: any): OpenAPIV3.RequestBodyObject | undefined => {
  if (!(zodSchema instanceof z.ZodSchema)) {
    throw new Error('Input parser expects ZodSchema');
  }

  if (zodSchema instanceof z.ZodVoid) {
    return undefined;
  }

  return {
    required: !zodSchema.isOptional(),
    content: {
      'application/json': {
        schema: zodSchemaToOpenApiSchemaObject(zodSchema),
      },
    },
  };
};

export const getResponsesObject = (zodSchema: any): OpenAPIV3.ResponsesObject => {
  if (!(zodSchema instanceof z.ZodSchema)) {
    throw new Error('Output parser expects ZodSchema');
  }

  const successResponse = {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: zodSchemaToOpenApiSchemaObject(
          z.object({
            ok: z.literal(true),
            data: zodSchema,
          }),
        ),
      },
    },
  };

  const errorResponse = {
    description: 'Error response',
    content: {
      'application/json': {
        schema: zodSchemaToOpenApiSchemaObject(
          z.object({
            ok: z.literal(false),
            error: z.object({
              message: z.string(),
            }),
          }),
        ),
      },
    },
  };

  return {
    200: successResponse,
    default: errorResponse,
  };
};
