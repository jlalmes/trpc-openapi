import * as trpc from '@trpc/server';
import { Subscription } from '@trpc/server';
import openAPISchemaValidator from 'openapi-schema-validator';
import { z } from 'zod';

import { OpenApiMeta, generateOpenApiDocument, openApiVersion } from '../src';

// TODO: test for duplicate paths (using getPathRegExp)

const openApiSchemaValidator = new openAPISchemaValidator({ version: openApiVersion });

describe('generator', () => {
  test('open api version', () => {
    expect(openApiVersion).toBe('3.0.3');
  });

  test('with empty router', () => {
    const appRouter = trpc.router<any, OpenApiMeta>();

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      description: 'API documentation',
      baseUrl: 'http://localhost:3000/api',
      docsUrl: 'http://localhost:3000/docs',
      tags: [],
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument).toMatchInlineSnapshot(`
      Object {
        "components": Object {
          "responses": Object {
            "error": Object {
              "content": Object {
                "application/json": Object {
                  "schema": Object {
                    "additionalProperties": false,
                    "properties": Object {
                      "error": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "code": Object {
                            "type": "string",
                          },
                          "issues": Object {
                            "items": Object {
                              "additionalProperties": false,
                              "properties": Object {
                                "message": Object {
                                  "type": "string",
                                },
                              },
                              "required": Array [
                                "message",
                              ],
                              "type": "object",
                            },
                            "type": "array",
                          },
                          "message": Object {
                            "type": "string",
                          },
                        },
                        "required": Array [
                          "message",
                          "code",
                        ],
                        "type": "object",
                      },
                      "ok": Object {
                        "enum": Array [
                          false,
                        ],
                        "type": "boolean",
                      },
                    },
                    "required": Array [
                      "ok",
                      "error",
                    ],
                    "type": "object",
                  },
                },
              },
              "description": "Error response",
            },
          },
          "securitySchemes": Object {
            "Authorization": Object {
              "scheme": "bearer",
              "type": "http",
            },
          },
        },
        "externalDocs": Object {
          "url": "http://localhost:3000/docs",
        },
        "info": Object {
          "description": "API documentation",
          "title": "tRPC OpenAPI",
          "version": "1.0.0",
        },
        "openapi": "3.0.3",
        "paths": Object {},
        "servers": Array [
          Object {
            "url": "http://localhost:3000/api",
          },
        ],
        "tags": Array [],
      }
    `);
  });

  test('with missing input', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('noInput', {
        meta: { openapi: { enabled: true, path: '/no-input', method: 'GET' } },
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'jlalmes' }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.noInput] - Input parser expects a Zod validator');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().mutation('noInput', {
        meta: { openapi: { enabled: true, path: '/no-input', method: 'POST' } },
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'jlalmes' }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[mutation.noInput] - Input parser expects a Zod validator');
    }
  });

  test('with missing output', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('noOutput', {
        meta: { openapi: { enabled: true, path: '/no-output', method: 'GET' } },
        input: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.noOutput] - Output parser expects a Zod validator');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().mutation('noOutput', {
        meta: { openapi: { enabled: true, path: '/no-output', method: 'POST' } },
        input: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[mutation.noOutput] - Output parser expects a Zod validator');
    }
  });

  test('with non-ZodObject input', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('badInput', {
        meta: { openapi: { enabled: true, path: '/bad-input', method: 'GET' } },
        input: z.string(),
        output: z.null(),
        resolve: () => null,
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.badInput] - Input parser must be a ZodObject');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().mutation('badInput', {
        meta: { openapi: { enabled: true, path: '/bad-input', method: 'POST' } },
        input: z.string(),
        output: z.null(),
        resolve: () => null,
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[mutation.badInput] - Input parser must be a ZodObject');
    }
  });

  test('with non-ZodParameterType input', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('badInput', {
        meta: { openapi: { enabled: true, path: '/bad-input', method: 'GET' } },
        input: z.object({ person: z.object({ age: z.number().min(0).max(122) }) }),
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'Jeanne Calment' }), // RIP
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.badInput] - Input parser key: "person" must be ZodParameterType');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().mutation('okInput', {
        meta: { openapi: { enabled: true, path: '/ok-input', method: 'POST' } },
        input: z.object({ person: z.object({ age: z.number().min(0).max(122) }) }),
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'Jeanne Calment' }),
      });

      const openApiDocument = generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });

      expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
      expect(openApiDocument.paths['/ok-input']!.post!.requestBody).toMatchInlineSnapshot(`
        Object {
          "content": Object {
            "application/json": Object {
              "schema": Object {
                "additionalProperties": false,
                "properties": Object {
                  "person": Object {
                    "additionalProperties": false,
                    "properties": Object {
                      "age": Object {
                        "maximum": 122,
                        "minimum": 0,
                        "type": "number",
                      },
                    },
                    "required": Array [
                      "age",
                    ],
                    "type": "object",
                  },
                },
                "required": Array [
                  "person",
                ],
                "type": "object",
              },
            },
          },
          "required": true,
        }
      `);
    }
  });

  test('with ZodParameterType query input', () => {
    {
      enum NativeStringEnum {
        James = 'James',
        jlalmes = 'jlalmes',
      }

      const likeStringRouter = trpc
        .router<any, OpenApiMeta>()
        .query('string', {
          meta: { openapi: { enabled: true, path: '/string', method: 'GET' } },
          input: z.object({ name: z.string() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringOptional', {
          meta: { openapi: { enabled: true, path: '/string-optional', method: 'GET' } },
          input: z.object({ name: z.string().optional() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringDefault', {
          meta: { openapi: { enabled: true, path: '/string-default', method: 'GET' } },
          input: z.object({ name: z.string().default('James') }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringPreprocess', {
          meta: { openapi: { enabled: true, path: '/string-preprocess', method: 'GET' } },
          input: z.object({ name: z.preprocess((arg) => arg, z.string()) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringLiteral', {
          meta: { openapi: { enabled: true, path: '/string-literal', method: 'GET' } },
          input: z.object({ name: z.literal('James') }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringEnum', {
          meta: { openapi: { enabled: true, path: '/string-enum', method: 'GET' } },
          input: z.object({ name: z.enum(['James', 'jlalmes']) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringNativeEnum', {
          meta: { openapi: { enabled: true, path: '/string-native-enum', method: 'GET' } },
          input: z.object({ name: z.nativeEnum(NativeStringEnum) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringUnion', {
          meta: { openapi: { enabled: true, path: '/string-union', method: 'GET' } },
          input: z.object({ name: z.union([z.literal('James'), z.literal('jlalmes')]) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringIntersection', {
          meta: { openapi: { enabled: true, path: '/string-intersection', method: 'GET' } },
          input: z.object({
            name: z.intersection(
              z.union([z.literal('a'), z.literal('b')]),
              z.union([z.literal('b'), z.literal('c')]),
            ),
          }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('stringLazy', {
          meta: { openapi: { enabled: true, path: '/string-lazy', method: 'GET' } },
          input: z.object({ name: z.lazy(() => z.string()) }),
          output: z.void(),
          resolve: () => undefined,
        });

      const openApiDocument = generateOpenApiDocument(likeStringRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });

      expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
      expect((openApiDocument.paths['/string']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'string',
      });
      expect(
        (openApiDocument.paths['/string-optional']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'string',
      });
      expect(
        (openApiDocument.paths['/string-default']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'string',
        default: 'James',
      });
      expect(
        (openApiDocument.paths['/string-preprocess']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'string',
      });
      expect(
        (openApiDocument.paths['/string-literal']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'string',
        enum: ['James'],
      });
      expect((openApiDocument.paths['/string-enum']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'string',
        enum: ['James', 'jlalmes'],
      });
      expect(
        (openApiDocument.paths['/string-native-enum']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'string',
        enum: ['James', 'jlalmes'],
      });
      expect((openApiDocument.paths['/string-union']!.get!.parameters![0]! as any).schema).toEqual({
        anyOf: [
          { type: 'string', enum: ['James'] },
          { type: 'string', enum: ['jlalmes'] },
        ],
      });
      expect(
        (openApiDocument.paths['/string-intersection']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        allOf: [
          {
            anyOf: [
              { type: 'string', enum: ['a'] },
              { type: 'string', enum: ['b'] },
            ],
          },
          {
            anyOf: [
              { type: 'string', enum: ['b'] },
              { type: 'string', enum: ['c'] },
            ],
          },
        ],
      });
      expect((openApiDocument.paths['/string-lazy']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'string',
      });
    }
    {
      enum NativeNumberEnum {
        James,
        jlalmes,
      }

      const numberLikeRouter = trpc
        .router<any, OpenApiMeta>()
        .query('number', {
          meta: { openapi: { enabled: true, path: '/number', method: 'GET' } },
          input: z.object({ name: z.number() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberOptional', {
          meta: { openapi: { enabled: true, path: '/number-optional', method: 'GET' } },
          input: z.object({ name: z.number().optional() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberDefault', {
          meta: { openapi: { enabled: true, path: '/number-default', method: 'GET' } },
          input: z.object({ name: z.number().default(123) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberPreprocess', {
          meta: { openapi: { enabled: true, path: '/number-preprocess', method: 'GET' } },
          input: z.object({ name: z.preprocess((arg) => arg, z.number()) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberLiteral', {
          meta: { openapi: { enabled: true, path: '/number-literal', method: 'GET' } },
          input: z.object({ name: z.literal(123) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberNativeEnum', {
          meta: { openapi: { enabled: true, path: '/number-native-enum', method: 'GET' } },
          input: z.object({ name: z.nativeEnum(NativeNumberEnum) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberUnion', {
          meta: { openapi: { enabled: true, path: '/number-union', method: 'GET' } },
          input: z.object({ name: z.union([z.literal(123), z.literal(456)]) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberIntersection', {
          meta: { openapi: { enabled: true, path: '/number-intersection', method: 'GET' } },
          input: z.object({
            name: z.intersection(
              z.union([z.literal(1), z.literal(2)]),
              z.union([z.literal(2), z.literal(3)]),
            ),
          }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('numberLazy', {
          meta: { openapi: { enabled: true, path: '/number-lazy', method: 'GET' } },
          input: z.object({ name: z.lazy(() => z.number()) }),
          output: z.void(),
          resolve: () => undefined,
        });

      const openApiDocument = generateOpenApiDocument(numberLikeRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });

      expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
      expect((openApiDocument.paths['/number']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'number',
      });
      expect(
        (openApiDocument.paths['/number-optional']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'number',
      });
      expect(
        (openApiDocument.paths['/number-default']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'number',
        default: 123,
      });
      expect(
        (openApiDocument.paths['/number-preprocess']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'number',
      });
      expect(
        (openApiDocument.paths['/number-literal']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'number',
        enum: [123],
      });
      expect(
        (openApiDocument.paths['/number-native-enum']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'number',
        enum: [0, 1],
      });
      expect((openApiDocument.paths['/number-union']!.get!.parameters![0]! as any).schema).toEqual({
        anyOf: [
          { type: 'number', enum: [123] },
          { type: 'number', enum: [456] },
        ],
      });
      expect(
        (openApiDocument.paths['/number-intersection']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        allOf: [
          {
            anyOf: [
              { type: 'number', enum: [1] },
              { type: 'number', enum: [2] },
            ],
          },
          {
            anyOf: [
              { type: 'number', enum: [2] },
              { type: 'number', enum: [3] },
            ],
          },
        ],
      });
      expect((openApiDocument.paths['/number-lazy']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'number',
      });
    }
    {
      const booleanLikeRouter = trpc
        .router<any, OpenApiMeta>()
        .query('boolean', {
          meta: { openapi: { enabled: true, path: '/boolean', method: 'GET' } },
          input: z.object({ name: z.boolean() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanOptional', {
          meta: { openapi: { enabled: true, path: '/boolean-optional', method: 'GET' } },
          input: z.object({ name: z.boolean().optional() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanDefault', {
          meta: { openapi: { enabled: true, path: '/boolean-default', method: 'GET' } },
          input: z.object({ name: z.boolean().default(true) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanPreprocess', {
          meta: { openapi: { enabled: true, path: '/boolean-preprocess', method: 'GET' } },
          input: z.object({ name: z.preprocess((arg) => arg, z.boolean()) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanLiteral', {
          meta: { openapi: { enabled: true, path: '/boolean-literal', method: 'GET' } },
          input: z.object({ name: z.literal(true) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanUnion', {
          meta: { openapi: { enabled: true, path: '/boolean-union', method: 'GET' } },
          input: z.object({ name: z.union([z.literal(true), z.literal(false)]) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanIntersection', {
          meta: { openapi: { enabled: true, path: '/boolean-intersection', method: 'GET' } },
          input: z.object({
            name: z.intersection(z.union([z.literal(true), z.literal(false)]), z.literal(true)),
          }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('booleanLazy', {
          meta: { openapi: { enabled: true, path: '/boolean-lazy', method: 'GET' } },
          input: z.object({ name: z.lazy(() => z.boolean()) }),
          output: z.void(),
          resolve: () => undefined,
        });

      const openApiDocument = generateOpenApiDocument(booleanLikeRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });

      expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
      expect((openApiDocument.paths['/boolean']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'boolean',
      });
      expect(
        (openApiDocument.paths['/boolean-optional']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'boolean',
      });
      expect(
        (openApiDocument.paths['/boolean-default']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'boolean',
        default: true,
      });
      expect(
        (openApiDocument.paths['/boolean-preprocess']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'boolean',
      });
      expect(
        (openApiDocument.paths['/boolean-literal']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'boolean',
        enum: [true],
      });
      expect((openApiDocument.paths['/boolean-union']!.get!.parameters![0]! as any).schema).toEqual(
        {
          anyOf: [
            { type: 'boolean', enum: [true] },
            { type: 'boolean', enum: [false] },
          ],
        },
      );
      expect(
        (openApiDocument.paths['/boolean-intersection']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        allOf: [
          {
            anyOf: [
              { type: 'boolean', enum: [true] },
              { type: 'boolean', enum: [false] },
            ],
          },
          { type: 'boolean', enum: [true] },
        ],
      });
      expect((openApiDocument.paths['/boolean-lazy']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'boolean',
      });
    }
    {
      const now = new Date();

      const dateLikeRouter = trpc
        .router<any, OpenApiMeta>()
        .query('date', {
          meta: { openapi: { enabled: true, path: '/date', method: 'GET' } },
          input: z.object({ name: z.date() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('dateOptional', {
          meta: { openapi: { enabled: true, path: '/date-optional', method: 'GET' } },
          input: z.object({ name: z.date().optional() }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('dateDefault', {
          meta: { openapi: { enabled: true, path: '/date-default', method: 'GET' } },
          input: z.object({ name: z.date().default(now) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('datePreprocess', {
          meta: { openapi: { enabled: true, path: '/date-preprocess', method: 'GET' } },
          input: z.object({ name: z.preprocess((arg) => arg, z.date()) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('dateUnion', {
          meta: { openapi: { enabled: true, path: '/date-union', method: 'GET' } },
          input: z.object({ name: z.union([z.date(), z.date()]) }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('dateIntersection', {
          meta: { openapi: { enabled: true, path: '/date-intersection', method: 'GET' } },
          input: z.object({
            name: z.intersection(z.date(), z.date()),
          }),
          output: z.void(),
          resolve: () => undefined,
        })
        .query('dateLazy', {
          meta: { openapi: { enabled: true, path: '/date-lazy', method: 'GET' } },
          input: z.object({ name: z.lazy(() => z.date()) }),
          output: z.void(),
          resolve: () => undefined,
        });

      const openApiDocument = generateOpenApiDocument(dateLikeRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });

      expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
      expect((openApiDocument.paths['/date']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'string',
        format: 'date-time',
      });
      expect((openApiDocument.paths['/date-optional']!.get!.parameters![0]! as any).schema).toEqual(
        {
          type: 'string',
          format: 'date-time',
        },
      );
      expect((openApiDocument.paths['/date-default']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'string',
        format: 'date-time',
        default: now,
      });
      expect(
        (openApiDocument.paths['/date-preprocess']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        type: 'string',
        format: 'date-time',
      });
      expect((openApiDocument.paths['/date-union']!.get!.parameters![0]! as any).schema).toEqual({
        anyOf: [
          { type: 'string', format: 'date-time' },
          { type: 'string', format: 'date-time' },
        ],
      });
      expect(
        (openApiDocument.paths['/date-intersection']!.get!.parameters![0]! as any).schema,
      ).toEqual({
        allOf: [
          { type: 'string', format: 'date-time' },
          { type: 'string', format: 'date-time' },
        ],
      });
      expect((openApiDocument.paths['/date-lazy']!.get!.parameters![0]! as any).schema).toEqual({
        type: 'string',
        format: 'date-time',
      });
    }
  });

  test('with bad method', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('postQuery', {
        meta: { openapi: { enabled: true, path: '/post-query', method: 'POST' } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.postQuery] - Query method must be GET or DELETE');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().mutation('getMutation', {
        meta: { openapi: { enabled: true, path: '/get-mutation', method: 'GET' } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[mutation.getMutation] - Mutation method must be POST, PATCH or PUT');
    }
  });

  test('with duplicate routes', () => {
    {
      const appRouter = trpc
        .router<any, OpenApiMeta>()
        .query('procedure1', {
          meta: { openapi: { enabled: true, path: '/procedure', method: 'GET' } },
          input: z.object({ name: z.string() }),
          output: z.object({ name: z.string() }),
          resolve: ({ input }) => ({ name: input.name }),
        })
        .query('procedure2', {
          meta: { openapi: { enabled: true, path: '/procedure', method: 'GET' } },
          input: z.object({ name: z.string() }),
          output: z.object({ name: z.string() }),
          resolve: ({ input }) => ({ name: input.name }),
        });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.procedure2] - Duplicate procedure defined for route GET /procedure');
    }
    {
      const appRouter = trpc
        .router<any, OpenApiMeta>()
        .query('procedure1', {
          meta: { openapi: { enabled: true, path: '/procedure/', method: 'GET' } },
          input: z.object({ name: z.string() }),
          output: z.object({ name: z.string() }),
          resolve: ({ input }) => ({ name: input.name }),
        })
        .query('procedure2', {
          meta: { openapi: { enabled: true, path: '/procedure', method: 'GET' } },
          input: z.object({ name: z.string() }),
          output: z.object({ name: z.string() }),
          resolve: ({ input }) => ({ name: input.name }),
        });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.procedure2] - Duplicate procedure defined for route GET /procedure');
    }
  });

  test('with unsupported subscription', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().subscription('currentName', {
      meta: { openapi: { enabled: true, path: '/current-name', method: 'PATCH' } },
      input: z.object({ name: z.string() }),
      resolve: ({ input }) =>
        new Subscription((emit) => {
          emit.data(input.name);
          return () => undefined;
        }),
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[subscription.currentName] - Subscriptions are not supported by OpenAPI v3');
  });

  test('with void and path parameters', () => {
    const appRouter = trpc.router().query('pathParameters', {
      meta: { openapi: { enabled: true, path: '/path-parameters/{name}', method: 'GET' } },
      input: z.void(),
      output: z.object({ name: z.string() }),
      resolve: () => ({ name: 'asdf' }),
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[query.pathParameters] - Input parser must be a ZodObject');
  });

  test('with optional path parameters', () => {
    const appRouter = trpc.router().query('pathParameters', {
      meta: { openapi: { enabled: true, path: '/path-parameters/{name}', method: 'GET' } },
      input: z.object({ name: z.string().optional() }),
      output: z.object({ name: z.string() }),
      resolve: () => ({ name: 'asdf' }),
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[query.pathParameters] - Path parameter: "name" must not be optional');
  });

  test('with missing path parameters', () => {
    const appRouter = trpc.router().query('pathParameters', {
      meta: { openapi: { enabled: true, path: '/path-parameters/{name}', method: 'GET' } },
      input: z.object({}),
      output: z.object({ name: z.string() }),
      resolve: () => ({ name: 'asdf' }),
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[query.pathParameters] - Input parser expects key from path: "name"');
  });

  test('with valid procedures', () => {
    const appRouter = trpc
      .router<any, OpenApiMeta>()
      .mutation('createUser', {
        meta: { openapi: { enabled: true, path: '/users', method: 'POST' } },
        input: z.object({ name: z.string() }),
        output: z.object({ id: z.string(), name: z.string() }),
        resolve: ({ input }) => ({ id: 'user-id', name: input.name }),
      })
      .query('readUsers', {
        meta: { openapi: { enabled: true, path: '/users', method: 'GET' } },
        input: z.void(),
        output: z.array(z.object({ id: z.string(), name: z.string() })),
        resolve: () => [{ id: 'user-id', name: 'name' }],
      })
      .query('readUser', {
        meta: { openapi: { enabled: true, path: '/users/{id}', method: 'GET' } },
        input: z.object({ id: z.string() }),
        output: z.object({ id: z.string(), name: z.string() }),
        resolve: ({ input }) => ({ id: input.id, name: 'name' }),
      })
      .mutation('updateUser', {
        meta: { openapi: { enabled: true, path: '/users/{id}', method: 'PATCH' } },
        input: z.object({ id: z.string(), name: z.string().optional() }),
        output: z.object({ id: z.string(), name: z.string() }),
        resolve: ({ input }) => ({ id: input.id, name: input.name ?? 'name' }),
      })
      .query('deleteUser', {
        meta: { openapi: { enabled: true, path: '/users/{id}', method: 'DELETE' } },
        input: z.object({ id: z.string() }),
        output: z.void(),
        resolve: () => undefined,
      });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument).toMatchInlineSnapshot(`
      Object {
        "components": Object {
          "responses": Object {
            "error": Object {
              "content": Object {
                "application/json": Object {
                  "schema": Object {
                    "additionalProperties": false,
                    "properties": Object {
                      "error": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "code": Object {
                            "type": "string",
                          },
                          "issues": Object {
                            "items": Object {
                              "additionalProperties": false,
                              "properties": Object {
                                "message": Object {
                                  "type": "string",
                                },
                              },
                              "required": Array [
                                "message",
                              ],
                              "type": "object",
                            },
                            "type": "array",
                          },
                          "message": Object {
                            "type": "string",
                          },
                        },
                        "required": Array [
                          "message",
                          "code",
                        ],
                        "type": "object",
                      },
                      "ok": Object {
                        "enum": Array [
                          false,
                        ],
                        "type": "boolean",
                      },
                    },
                    "required": Array [
                      "ok",
                      "error",
                    ],
                    "type": "object",
                  },
                },
              },
              "description": "Error response",
            },
          },
          "securitySchemes": Object {
            "Authorization": Object {
              "scheme": "bearer",
              "type": "http",
            },
          },
        },
        "externalDocs": undefined,
        "info": Object {
          "description": undefined,
          "title": "tRPC OpenAPI",
          "version": "1.0.0",
        },
        "openapi": "3.0.3",
        "paths": Object {
          "/users": Object {
            "get": Object {
              "description": undefined,
              "parameters": undefined,
              "responses": Object {
                "200": Object {
                  "content": Object {
                    "application/json": Object {
                      "schema": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "data": Object {
                            "items": Object {
                              "additionalProperties": false,
                              "properties": Object {
                                "id": Object {
                                  "type": "string",
                                },
                                "name": Object {
                                  "type": "string",
                                },
                              },
                              "required": Array [
                                "id",
                                "name",
                              ],
                              "type": "object",
                            },
                            "type": "array",
                          },
                          "ok": Object {
                            "enum": Array [
                              true,
                            ],
                            "type": "boolean",
                          },
                        },
                        "required": Array [
                          "ok",
                          "data",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
                "default": Object {
                  "$ref": "#/components/responses/error",
                },
              },
              "security": undefined,
              "summary": undefined,
              "tags": undefined,
            },
            "post": Object {
              "description": undefined,
              "parameters": Array [],
              "requestBody": Object {
                "content": Object {
                  "application/json": Object {
                    "schema": Object {
                      "additionalProperties": false,
                      "properties": Object {
                        "name": Object {
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "name",
                      ],
                      "type": "object",
                    },
                  },
                },
                "required": true,
              },
              "responses": Object {
                "200": Object {
                  "content": Object {
                    "application/json": Object {
                      "schema": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "data": Object {
                            "additionalProperties": false,
                            "properties": Object {
                              "id": Object {
                                "type": "string",
                              },
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "id",
                              "name",
                            ],
                            "type": "object",
                          },
                          "ok": Object {
                            "enum": Array [
                              true,
                            ],
                            "type": "boolean",
                          },
                        },
                        "required": Array [
                          "ok",
                          "data",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
                "default": Object {
                  "$ref": "#/components/responses/error",
                },
              },
              "security": undefined,
              "summary": undefined,
              "tags": undefined,
            },
          },
          "/users/{id}": Object {
            "delete": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "description": undefined,
                  "in": "path",
                  "name": "id",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                },
              ],
              "responses": Object {
                "200": Object {
                  "content": Object {
                    "application/json": Object {
                      "schema": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "ok": Object {
                            "enum": Array [
                              true,
                            ],
                            "type": "boolean",
                          },
                        },
                        "required": Array [
                          "ok",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
                "default": Object {
                  "$ref": "#/components/responses/error",
                },
              },
              "security": undefined,
              "summary": undefined,
              "tags": undefined,
            },
            "get": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "description": undefined,
                  "in": "path",
                  "name": "id",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                },
              ],
              "responses": Object {
                "200": Object {
                  "content": Object {
                    "application/json": Object {
                      "schema": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "data": Object {
                            "additionalProperties": false,
                            "properties": Object {
                              "id": Object {
                                "type": "string",
                              },
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "id",
                              "name",
                            ],
                            "type": "object",
                          },
                          "ok": Object {
                            "enum": Array [
                              true,
                            ],
                            "type": "boolean",
                          },
                        },
                        "required": Array [
                          "ok",
                          "data",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
                "default": Object {
                  "$ref": "#/components/responses/error",
                },
              },
              "security": undefined,
              "summary": undefined,
              "tags": undefined,
            },
            "patch": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "description": undefined,
                  "in": "path",
                  "name": "id",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                },
              ],
              "requestBody": Object {
                "content": Object {
                  "application/json": Object {
                    "schema": Object {
                      "additionalProperties": false,
                      "properties": Object {
                        "name": Object {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                  },
                },
                "required": true,
              },
              "responses": Object {
                "200": Object {
                  "content": Object {
                    "application/json": Object {
                      "schema": Object {
                        "additionalProperties": false,
                        "properties": Object {
                          "data": Object {
                            "additionalProperties": false,
                            "properties": Object {
                              "id": Object {
                                "type": "string",
                              },
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "id",
                              "name",
                            ],
                            "type": "object",
                          },
                          "ok": Object {
                            "enum": Array [
                              true,
                            ],
                            "type": "boolean",
                          },
                        },
                        "required": Array [
                          "ok",
                          "data",
                        ],
                        "type": "object",
                      },
                    },
                  },
                  "description": "Successful response",
                },
                "default": Object {
                  "$ref": "#/components/responses/error",
                },
              },
              "security": undefined,
              "summary": undefined,
              "tags": undefined,
            },
          },
        },
        "servers": Array [
          Object {
            "url": "http://localhost:3000/api",
          },
        ],
        "tags": undefined,
      }
    `);
  });

  test('with disabled', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('getMe', {
      meta: { openapi: { enabled: false, path: '/me', method: 'GET' } },
      input: z.object({ id: z.string() }),
      output: z.object({ id: z.string() }),
      resolve: ({ input }) => ({ id: input.id }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(Object.keys(openApiDocument.paths).length).toBe(0);
  });

  test('with void', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('void', {
      meta: { openapi: { enabled: true, path: '/void', method: 'POST' } },
      input: z.void(),
      output: z.void(),
      resolve: () => undefined,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/void']!.post!.requestBody).toMatchInlineSnapshot(`undefined`);
    expect(openApiDocument.paths['/void']!.post!.responses[200]).toMatchInlineSnapshot(`
      Object {
        "content": Object {
          "application/json": Object {
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "ok": Object {
                  "enum": Array [
                    true,
                  ],
                  "type": "boolean",
                },
              },
              "required": Array [
                "ok",
              ],
              "type": "object",
            },
          },
        },
        "description": "Successful response",
      }
    `);
  });

  test('with null', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('null', {
      meta: { openapi: { enabled: true, path: '/null', method: 'POST' } },
      input: z.void(),
      output: z.null(),
      resolve: () => null,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/null']!.post!.responses[200]).toMatchInlineSnapshot(`
      Object {
        "content": Object {
          "application/json": Object {
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "data": Object {
                  "enum": Array [
                    "null",
                  ],
                  "nullable": true,
                },
                "ok": Object {
                  "enum": Array [
                    true,
                  ],
                  "type": "boolean",
                },
              },
              "required": Array [
                "ok",
                "data",
              ],
              "type": "object",
            },
          },
        },
        "description": "Successful response",
      }
    `);
  });

  test('with undefined', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('undefined', {
      meta: { openapi: { enabled: true, path: '/undefined', method: 'POST' } },
      input: z.undefined(),
      output: z.undefined(),
      resolve: () => undefined,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/undefined']!.post!.requestBody).toMatchInlineSnapshot(
      `undefined`,
    );
    expect(openApiDocument.paths['/undefined']!.post!.responses[200]).toMatchInlineSnapshot(`
      Object {
        "content": Object {
          "application/json": Object {
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "data": Object {
                  "not": Object {},
                },
                "ok": Object {
                  "enum": Array [
                    true,
                  ],
                  "type": "boolean",
                },
              },
              "required": Array [
                "ok",
              ],
              "type": "object",
            },
          },
        },
        "description": "Successful response",
      }
    `);
  });

  test('with nullish', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('nullish', {
      meta: { openapi: { enabled: true, path: '/nullish', method: 'POST' } },
      input: z.void(),
      output: z.string().nullish(),
      resolve: () => null,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/nullish']!.post!.responses[200]).toMatchInlineSnapshot(`
      Object {
        "content": Object {
          "application/json": Object {
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "data": Object {
                  "anyOf": Array [
                    Object {
                      "not": Object {},
                    },
                    Object {
                      "type": "string",
                    },
                  ],
                  "nullable": true,
                },
                "ok": Object {
                  "enum": Array [
                    true,
                  ],
                  "type": "boolean",
                },
              },
              "required": Array [
                "ok",
              ],
              "type": "object",
            },
          },
        },
        "description": "Successful response",
      }
    `);
  });

  test('with never', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('never', {
      meta: { openapi: { enabled: true, path: '/never', method: 'POST' } },
      input: z.never(),
      output: z.void(),
      resolve: () => undefined,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/never']!.post!.requestBody).toMatchInlineSnapshot(`undefined`);
  });

  test('with transform', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('transform', {
      meta: { openapi: { enabled: true, path: '/transform', method: 'GET' } },
      input: z.object({ age: z.string().transform((input) => parseInt(input)) }),
      output: z.object({ age: z.number() }),
      resolve: ({ input }) => ({ age: input.age }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/transform']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "age",
          "required": true,
          "schema": Object {
            "type": "string",
          },
        },
      ]
    `);
  });

  test('with refine', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('refine', {
      meta: { openapi: { enabled: true, path: '/refine', method: 'GET' } },
      input: z.object({
        age: z.string().refine((input) => parseInt(input) < 18, { message: 'Too young' }),
      }),
      output: z.number(),
      resolve: ({ input }) => parseInt(input.age),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/refine']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "age",
          "required": true,
          "schema": Object {
            "type": "string",
          },
        },
      ]
    `);
  });

  test('with preprocess', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('preprocess', {
      meta: { openapi: { enabled: true, path: '/preprocess', method: 'GET' } },
      input: z.object({
        age: z.preprocess((arg) => {
          if (typeof arg === 'string') return parseInt(arg);
          return arg;
        }, z.number()),
      }),
      output: z.object({ age: z.number() }),
      resolve: ({ input }) => ({ age: input.age }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/preprocess']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "age",
          "required": true,
          "schema": Object {
            "type": "number",
          },
        },
      ]
    `);
  });

  test('with summary, description & tag', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('all.metadata', {
      meta: {
        openapi: {
          enabled: true,
          path: '/metadata/all',
          method: 'GET',
          summary: 'Short summary',
          description: 'Verbose description',
          tag: 'tag',
        },
      },
      input: z.object({ name: z.string() }),
      output: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/metadata/all']!.get!.summary).toBe('Short summary');
    expect(openApiDocument.paths['/metadata/all']!.get!.description).toBe('Verbose description');
    expect(openApiDocument.paths['/metadata/all']!.get!.tags).toEqual(['tag']);
  });

  test('with security', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('protectedEndpoint', {
      meta: {
        openapi: {
          enabled: true,
          path: '/secure/endpoint',
          method: 'POST',
          protect: true,
        },
      },
      input: z.object({ name: z.string() }),
      output: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/secure/endpoint']!.post!.security).toEqual([
      { Authorization: [] },
    ]);
  });

  test('with schema description', () => {
    const appRouter = trpc
      .router<any, OpenApiMeta>()
      .mutation('createUser', {
        meta: { openapi: { enabled: true, path: '/user', method: 'POST' } },
        input: z
          .object({
            id: z.string().uuid().describe('User ID'),
            name: z.string().describe('User name'),
          })
          .describe('Request body input'),
        output: z
          .object({
            id: z.string().uuid().describe('User ID'),
            name: z.string().describe('User name'),
          })
          .describe('User data'),
        resolve: ({ input }) => ({ id: input.id, name: 'James' }),
      })
      .query('getUser', {
        meta: { openapi: { enabled: true, path: '/user', method: 'GET' } },
        input: z
          .object({ id: z.string().uuid().describe('User ID') })
          .describe('Query string inputs'),
        output: z
          .object({
            id: z.string().uuid().describe('User ID'),
            name: z.string().describe('User name'),
          })
          .describe('User data'),
        resolve: ({ input }) => ({ id: input.id, name: 'James' }),
      });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/user']!.post!).toMatchInlineSnapshot(`
      Object {
        "description": undefined,
        "parameters": Array [],
        "requestBody": Object {
          "content": Object {
            "application/json": Object {
              "schema": Object {
                "additionalProperties": false,
                "description": "Request body input",
                "properties": Object {
                  "id": Object {
                    "description": "User ID",
                    "format": "uuid",
                    "type": "string",
                  },
                  "name": Object {
                    "description": "User name",
                    "type": "string",
                  },
                },
                "required": Array [
                  "id",
                  "name",
                ],
                "type": "object",
              },
            },
          },
          "required": true,
        },
        "responses": Object {
          "200": Object {
            "content": Object {
              "application/json": Object {
                "schema": Object {
                  "additionalProperties": false,
                  "properties": Object {
                    "data": Object {
                      "additionalProperties": false,
                      "description": "User data",
                      "properties": Object {
                        "id": Object {
                          "description": "User ID",
                          "format": "uuid",
                          "type": "string",
                        },
                        "name": Object {
                          "description": "User name",
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "id",
                        "name",
                      ],
                      "type": "object",
                    },
                    "ok": Object {
                      "enum": Array [
                        true,
                      ],
                      "type": "boolean",
                    },
                  },
                  "required": Array [
                    "ok",
                    "data",
                  ],
                  "type": "object",
                },
              },
            },
            "description": "Successful response",
          },
          "default": Object {
            "$ref": "#/components/responses/error",
          },
        },
        "security": undefined,
        "summary": undefined,
        "tags": undefined,
      }
    `);
    expect(openApiDocument.paths['/user']!.get!).toMatchInlineSnapshot(`
      Object {
        "description": undefined,
        "parameters": Array [
          Object {
            "description": "User ID",
            "in": "query",
            "name": "id",
            "required": true,
            "schema": Object {
              "format": "uuid",
              "type": "string",
            },
          },
        ],
        "responses": Object {
          "200": Object {
            "content": Object {
              "application/json": Object {
                "schema": Object {
                  "additionalProperties": false,
                  "properties": Object {
                    "data": Object {
                      "additionalProperties": false,
                      "description": "User data",
                      "properties": Object {
                        "id": Object {
                          "description": "User ID",
                          "format": "uuid",
                          "type": "string",
                        },
                        "name": Object {
                          "description": "User name",
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "id",
                        "name",
                      ],
                      "type": "object",
                    },
                    "ok": Object {
                      "enum": Array [
                        true,
                      ],
                      "type": "boolean",
                    },
                  },
                  "required": Array [
                    "ok",
                    "data",
                  ],
                  "type": "object",
                },
              },
            },
            "description": "Successful response",
          },
          "default": Object {
            "$ref": "#/components/responses/error",
          },
        },
        "security": undefined,
        "summary": undefined,
        "tags": undefined,
      }
    `);
  });

  test('with optional query input', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('optional', {
      meta: { openapi: { enabled: true, path: '/optional', method: 'GET' } },
      input: z.object({ payload: z.string().optional() }),
      output: z.string().optional(),
      resolve: ({ input }) => input.payload,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/optional']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "payload",
          "required": false,
          "schema": Object {
            "type": "string",
          },
        },
      ]
    `);
    expect(openApiDocument.paths['/optional']!.get!.responses[200]).toMatchInlineSnapshot(`
      Object {
        "content": Object {
          "application/json": Object {
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "data": Object {
                  "type": "string",
                },
                "ok": Object {
                  "enum": Array [
                    true,
                  ],
                  "type": "boolean",
                },
              },
              "required": Array [
                "ok",
              ],
              "type": "object",
            },
          },
        },
        "description": "Successful response",
      }
    `);
  });

  test('with record', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('record', {
      meta: { openapi: { enabled: true, path: '/record', method: 'GET' } },
      input: z.record(z.string()),
      output: z.void(),
      resolve: () => undefined,
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[query.record] - Input parser must be a ZodObject');
  });

  test('with async transform', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('asyncTransform', {
      meta: { openapi: { enabled: true, path: '/async-transform', method: 'GET' } },
      input: z.object({
        age: z.string().transform(async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return parseInt(input);
        }),
      }),
      output: z.object({ age: z.number() }),
      resolve: ({ input }) => ({ age: input.age }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/async-transform']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "age",
          "required": true,
          "schema": Object {
            "type": "string",
          },
        },
      ]
    `);
  });

  test('with lazy', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('lazy', {
      meta: { openapi: { enabled: true, path: '/lazy', method: 'GET' } },
      input: z.object({ name: z.lazy(() => z.string()) }),
      output: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/lazy']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "name",
          "required": true,
          "schema": Object {
            "type": "string",
          },
        },
      ]
    `);
  });
});
