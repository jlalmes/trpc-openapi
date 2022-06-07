import { TRPCError } from '@trpc/server';
import e from 'express';
import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

const zodSchemaToOpenApiSchemaObject = (zodSchema: z.ZodType): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(zodSchema, { target: 'openApi3' });
};

const instanceofZod = (type: any): type is z.ZodType => {
  return !!type?._def?.typeName;
};

const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  type: any,
  zodTypeKind: Z,
): type is InstanceType<typeof z[Z]> => {
  return type?._def?.typeName === zodTypeKind;
};

const unwrapZodType = (type: z.ZodType): z.ZodType => {
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodOptional)) {
    return unwrapZodType(type.unwrap());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodDefault)) {
    return unwrapZodType(type.removeDefault());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEffects)) {
    return unwrapZodType(type.innerType());
  }
  return type;
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

      const unwrappedZodType = unwrapZodType(value);
      if (
        !instanceofZodTypeKind(unwrappedZodType, z.ZodFirstPartyTypeKind.ZodString) &&
        !instanceofZodTypeKind(unwrappedZodType, z.ZodFirstPartyTypeKind.ZodEnum) &&
        !instanceofZodTypeKind(unwrappedZodType, z.ZodFirstPartyTypeKind.ZodNativeEnum) &&
        !(
          instanceofZodTypeKind(unwrappedZodType, z.ZodFirstPartyTypeKind.ZodLiteral) &&
          typeof unwrappedZodType._def.value === 'string'
        )
      ) {
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
