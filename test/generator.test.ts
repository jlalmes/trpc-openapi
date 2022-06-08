import * as trpc from '@trpc/server';
import { Subscription } from '@trpc/server';
import e from 'express';
import openAPISchemaValidator from 'openapi-schema-validator';
import { z } from 'zod';

import { OpenApiMeta, generateOpenApiDocument, openApiVersion } from '../src';

// TODO: test for duplicate paths (using getPathRegExp)
// TODO: tags ordering

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

  test('with non-object input', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('badInput', {
        meta: { openapi: { enabled: true, path: '/bad-input', method: 'GET' } },
        input: z.string(),
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'jlalmes' }),
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
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'jlalmes' }),
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

  test('with object-non-string-value input', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('badInput', {
        meta: { openapi: { enabled: true, path: '/bad-input', method: 'GET' } },
        input: z.object({ age: z.number() }),
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'jlalmes' }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.badInput] - Input parser key: "age" must be a ZodString');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().mutation('okInput', {
        meta: { openapi: { enabled: true, path: '/ok-input', method: 'POST' } },
        input: z.object({ age: z.number().min(0).max(122) }), // RIP Jeanne Calment
        output: z.object({ name: z.string() }),
        resolve: () => ({ name: 'jlalmes' }),
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
          },
          "required": true,
        }
      `);
    }
  });

  test('with object-enum-value input', () => {
    enum NativeNameEnum {
      James = 'James',
      jlalmes = 'jlalmes',
    }

    const appRouter = trpc
      .router<any, OpenApiMeta>()
      .query('enum', {
        meta: { openapi: { enabled: true, path: '/enum', method: 'GET' } },
        input: z.object({ name: z.enum(['James', 'jlalmes']) }),
        output: z.object({ name: z.enum(['James', 'jlalmes']) }),
        resolve: () => ({ name: 'jlalmes' as const }),
      })
      .query('nativeEnum', {
        meta: { openapi: { enabled: true, path: '/native-enum', method: 'GET' } },
        input: z.object({ age: z.nativeEnum(NativeNameEnum) }),
        output: z.object({ name: z.nativeEnum(NativeNameEnum) }),
        resolve: () => ({ name: NativeNameEnum.James }),
      });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/enum']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "name",
          "required": true,
          "schema": Object {
            "enum": Array [
              "James",
              "jlalmes",
            ],
            "type": "string",
          },
        },
      ]
    `);
    expect(openApiDocument.paths['/native-enum']!.get!.parameters).toMatchInlineSnapshot(`
      Array [
        Object {
          "description": undefined,
          "in": "query",
          "name": "age",
          "required": true,
          "schema": Object {
            "enum": Array [
              "James",
              "jlalmes",
            ],
            "type": "string",
          },
        },
      ]
    `);
  });

  test('with object-literal-value input', () => {
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('numberLiteral', {
        meta: { openapi: { enabled: true, path: '/number-literal', method: 'GET' } },
        input: z.object({ num: z.literal(123) }),
        output: z.object({ num: z.literal(123) }),
        resolve: () => ({ num: 123 as const }),
      });

      expect(() => {
        generateOpenApiDocument(appRouter, {
          title: 'tRPC OpenAPI',
          version: '1.0.0',
          baseUrl: 'http://localhost:3000/api',
        });
      }).toThrowError('[query.numberLiteral] - Input parser key: "num" must be a ZodString');
    }
    {
      const appRouter = trpc.router<any, OpenApiMeta>().query('stringLiteral', {
        meta: { openapi: { enabled: true, path: '/string-literal', method: 'GET' } },
        input: z.object({ str: z.literal('strlitval') }),
        output: z.object({ str: z.literal('strlitval') }),
        resolve: () => ({ str: 'strlitval' as const }),
      });

      const openApiDocument = generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });

      expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
      expect(openApiDocument.paths['/string-literal']!.get!.parameters).toMatchInlineSnapshot(`
        Array [
          Object {
            "description": undefined,
            "in": "query",
            "name": "str",
            "required": true,
            "schema": Object {
              "enum": Array [
                "strlitval",
              ],
              "type": "string",
            },
          },
        ]
      `);
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

  test('with summary, description & tags', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('all.metadata', {
      meta: {
        openapi: {
          enabled: true,
          path: '/metadata/all',
          method: 'GET',
          summary: 'Short summary',
          description: 'Verbose description',
          tags: ['tag'],
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

  test('with schema descriptions', () => {
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
});
