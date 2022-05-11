import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

const parserToZod = (parser: any, type: 'input' | 'output') => {
  if (!(parser instanceof z.ZodType)) {
    throw new Error(
      `${type === 'input' ? 'Input' : 'Output'} parser is required and must be instance of ZodType`,
    );
  }
  return parser;
};

const zodToOpenApiSchema = (zod: z.ZodType): OpenAPIV3.SchemaObject => {
  return zodToJsonSchema(zod, { target: 'openApi3' });
};

export const getRequestQueryParametersSchema = (
  parser: any,
): OpenAPIV3.ParameterObject[] | undefined => {
  const zod = parserToZod(parser, 'input');
  if (!(zod instanceof z.ZodObject)) {
    throw new Error('Query input parser must be instance of ZodObject');
  }

  return Object.keys(zod.shape).map((zodKey) => {
    const zodValue = zod.shape[zodKey];
    if (!(zodValue instanceof z.ZodString)) {
      throw new Error('Query input parser object values must be instance of ZodString');
    }

    return {
      name: zodKey,
      in: 'query',
      required: !zodValue.isOptional(),
      schema: zodToOpenApiSchema(zodValue),
      style: 'form',
      explode: true,
    };
  });
};

export const getRequestBodySchema = (parser: any): OpenAPIV3.RequestBodyObject | undefined => {
  const zod = parserToZod(parser, 'input');

  return {
    required: !zod.isOptional(),
    content: {
      'application/json': {
        schema: zodToOpenApiSchema(zod),
      },
    },
  };
};

export const getReponseBodySchema = (parser: any): OpenAPIV3.ResponsesObject => {
  const zod = parserToZod(parser, 'output');

  return {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: zodToOpenApiSchema(
            z.object({
              ok: z.literal(true),
              data: zod,
            }),
          ),
        },
      },
    },
    default: {
      description: 'Error response',
      content: {
        'application/json': {
          schema: zodToOpenApiSchema(
            z.object({
              ok: z.literal(false),
              error: z.object({
                message: z.string(),
              }),
            }),
          ),
        },
      },
    },
  };
};
