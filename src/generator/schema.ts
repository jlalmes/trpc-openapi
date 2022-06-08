import { TRPCError } from '@trpc/server';
import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

import { instanceofZod, instanceofZodTypeKind } from '../utils';

const zodSchemaToOpenApiSchemaObject = (zodSchema: z.ZodType): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(zodSchema, { target: 'openApi3' });
};

const getBaseZodType = (type: z.ZodType): z.ZodType => {
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodOptional)) {
    return getBaseZodType(type.unwrap());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodDefault)) {
    return getBaseZodType(type.removeDefault());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEffects)) {
    return getBaseZodType(type.innerType());
  }
  return type;
};

export const getParameterObjects = (
  schema: unknown,
  pathParameters: string[],
  inType: 'all' | 'path' | 'query',
): OpenAPIV3.ParameterObject[] | undefined => {
  if (!instanceofZod(schema)) {
    throw new TRPCError({
      message: 'Input parser expects a Zod validator',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  if (
    pathParameters.length === 0 &&
    (instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodVoid) ||
      instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodUndefined) ||
      instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodNever))
  ) {
    return undefined;
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

      // TODO: support ZodUnion/z.or if string vals
      // TODO: validate ZodNativeEnum is using string vals
      const baseZodType = getBaseZodType(value);
      if (
        !instanceofZodTypeKind(baseZodType, z.ZodFirstPartyTypeKind.ZodString) &&
        !instanceofZodTypeKind(baseZodType, z.ZodFirstPartyTypeKind.ZodEnum) &&
        !instanceofZodTypeKind(baseZodType, z.ZodFirstPartyTypeKind.ZodNativeEnum) &&
        !(
          instanceofZodTypeKind(baseZodType, z.ZodFirstPartyTypeKind.ZodLiteral) &&
          typeof baseZodType._def.value === 'string'
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

export const getRequestBodyObject = (
  schema: unknown,
  pathParameters: string[],
): OpenAPIV3.RequestBodyObject | undefined => {
  if (!instanceofZod(schema)) {
    throw new TRPCError({
      message: 'Input parser expects a Zod validator',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  if (
    instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodVoid) ||
    instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodUndefined) ||
    instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodNever)
  ) {
    return undefined;
  }

  if (!instanceofZodTypeKind(schema, z.ZodFirstPartyTypeKind.ZodObject)) {
    throw new TRPCError({
      message: 'Input parser must be a ZodObject',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }

  // remove path parameters
  const mask: Record<string, true> = {};
  pathParameters.forEach((pathParameter) => {
    mask[pathParameter] = true;
  });
  const dedupedSchema = schema.omit(mask);

  return {
    required: !schema.isOptional(),
    content: {
      'application/json': {
        schema: zodSchemaToOpenApiSchemaObject(dedupedSchema),
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
