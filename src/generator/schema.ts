import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

const zodSchemaToOpenApiSchemaObject = (zodSchema: z.ZodType): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(zodSchema, { target: 'openApi3' });
};

const zodInstanceofZodType = (schema: any): schema is z.ZodType => {
  return !!schema?._def?.typeName;
};

const zodInstanceof = <Z extends z.ZodFirstPartyTypeKind>(
  schema: any,
  zodTypeKind: Z,
): schema is InstanceType<typeof z[Z]> => {
  return schema?._def?.typeName === zodTypeKind;
};

const getBaseZodType = (schema: z.ZodType): z.ZodType => {
  if (
    zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodOptional) ||
    zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodNullable)
  ) {
    return getBaseZodType(schema.unwrap());
  }
  if (zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodDefault)) {
    return getBaseZodType(schema.removeDefault());
  }
  if (zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodEffects)) {
    return getBaseZodType(schema.innerType());
  }
  // TODO: ZodLazy?
  return schema;
};

export const getParameterObjects = (schema: unknown): OpenAPIV3.ParameterObject[] | undefined => {
  if (!zodInstanceofZodType(schema)) {
    throw new Error('Input parser expects ZodType');
  }

  if (
    !zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodObject) &&
    !zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodVoid)
  ) {
    throw new Error('Input parser expects ZodObject or ZodVoid');
  }

  if (zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodVoid)) {
    return undefined;
  }

  const shape = schema.shape;
  return Object.keys(shape).map((key) => {
    const value = shape[key]!;

    if (!zodInstanceof(getBaseZodType(value), z.ZodFirstPartyTypeKind.ZodString)) {
      throw new Error('Input parser expects ZodObject<{ [string]: ZodString }>');
    }

    return {
      name: key,
      in: 'query',
      required: !value.isOptional(),
      schema: zodSchemaToOpenApiSchemaObject(value),
      style: 'form',
      explode: true,
    };
  });
};

export const getRequestBodyObject = (schema: unknown): OpenAPIV3.RequestBodyObject | undefined => {
  if (!zodInstanceofZodType(schema)) {
    throw new Error('Input parser expects ZodType');
  }

  if (zodInstanceof(schema, z.ZodFirstPartyTypeKind.ZodVoid)) {
    return undefined;
  }

  return {
    required: !schema.isOptional(),
    content: {
      'application/json': {
        schema: zodSchemaToOpenApiSchemaObject(schema),
      },
    },
  };
};

export const getResponsesObject = (schema: unknown): OpenAPIV3.ResponsesObject => {
  if (!zodInstanceofZodType(schema)) {
    throw new Error('Output parser expects ZodType');
  }

  const successResponse = {
    description: 'Successful response',
    content: {
      'application/json': {
        schema: zodSchemaToOpenApiSchemaObject(
          z.object({
            ok: z.literal(true),
            data: schema,
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
              code: z.string(),
              issues: z.array(z.object({})).optional(),
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
