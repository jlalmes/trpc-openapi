import { TRPCError } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

const zodSchemaToOpenApiSchemaObject = (zodSchema: z.ZodType): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(zodSchema, { target: 'openApi3' });
};

const instanceofZod = (schema: any): schema is z.ZodType => {
  return !!schema?._def?.typeName;
};

const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  schema: any,
  zodTypeKind: Z,
): schema is InstanceType<typeof z[Z]> => {
  return schema?._def?.typeName === zodTypeKind;
};

const getBaseZodType = (schema: z.ZodType): z.ZodType => {
  if (instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodOptional)) {
    return getBaseZodType(schema.unwrap());
  }
  if (instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodDefault)) {
    return getBaseZodType(schema.removeDefault());
  }
  if (instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodEffects)) {
    return getBaseZodType(schema.innerType());
  }
  return schema;
};

export const getParameterObjects = (
  schema: unknown,
  pathParameters: string[],
  inType: 'all' | 'path' | 'query',
): OpenAPIV3.ParameterObject[] => {
  if (!instanceofZod(schema)) {
    throw new TRPCError({
      message: 'Input parser expects a Zod validator',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  if (!instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodObject)) {
    throw new TRPCError({
      message: 'Input parser must be a ZodObject',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  const shape = schema.shape;
  const keys = Object.keys(shape);

  for (const pathParameter of pathParameters) {
    if (!keys.includes(pathParameter)) {
      throw new TRPCError({
        message: `Input parser expects key from path: "${pathParameter}"`,
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  }

  return keys
    .filter((key) => {
      const isPathParameter = pathParameters.includes(key);
      if (inType === 'path') {
        return isPathParameter;
      } else if (inType === 'query') {
        return !isPathParameter;
      }
      return true;
    })
    .map((key) => {
      const value = shape[key]!;

      if (!instanceofZodTypeKind(getBaseZodType(value), z.ZodFirstPartyTypeKind.ZodString)) {
        throw new TRPCError({
          message: `Input parser key: "${key}" must be a ZodString`,
          code: 'INTERNAL_SERVER_ERROR',
        });
      }

      const isPathParameter = pathParameters.includes(key);
      const { description, ...schema } = zodSchemaToOpenApiSchemaObject(value);

      return {
        name: key,
        in: isPathParameter ? 'path' : 'query',
        required: isPathParameter || !value.isOptional(),
        schema: schema,
        description: description,
      };
    });
};

export const getRequestBodyObject = (schema: unknown): OpenAPIV3.RequestBodyObject | undefined => {
  if (!instanceofZod(schema)) {
    throw new TRPCError({
      message: 'Input parser expects a Zod validator',
      code: 'INTERNAL_SERVER_ERROR',
    });
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

export const errorResponseObject = {
  description: 'Error response',
  content: {
    'application/json': {
      schema: zodSchemaToOpenApiSchemaObject(
        z.object({
          ok: z.literal(false),
          error: z.object({
            message: z.string(),
            code: z.string(),
            issues: z.array(z.object({ message: z.string() })).optional(),
          }),
        }),
      ),
    },
  },
};

export const getResponsesObject = (schema: unknown): OpenAPIV3.ResponsesObject => {
  if (!instanceofZod(schema)) {
    throw new TRPCError({
      message: 'Output parser expects a Zod validator',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  const successResponseObject = {
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

  return {
    200: successResponseObject,
    default: {
      $ref: '#/components/responses/error',
    },
  };
};
