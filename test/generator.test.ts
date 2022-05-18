import * as trpc from '@trpc/server';
import { Subscription } from '@trpc/server';
import openAPISchemaValidator from 'openapi-schema-validator';
import { z } from 'zod';

import { OpenApiMeta, generateOpenApiDocument, openApiVersion } from '../src';

const openApiSchemaValidator = new openAPISchemaValidator({ version: openApiVersion });

describe('generator', () => {
  test('open api version', () => {
    expect(openApiVersion).toBe('3.0.3');
  });

  test('empty router', () => {
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

  describe('with missing input', () => {
    test('query', () => {
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
      }).toThrowError('[query.noInput] - Input parser expects ZodType');
    });

    test('mutation', () => {
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
      }).toThrowError('[mutation.noInput] - Input parser expects ZodType');
    });
  });

  describe('with missing output', () => {
    test('query', () => {
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
      }).toThrowError('[query.noOutput] - Output parser expects ZodType');
    });

    test('mutation', () => {
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
      }).toThrowError('[mutation.noOutput] - Output parser expects ZodType');
    });
  });

  test('with query non-object input', () => {
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
    }).toThrowError('[query.badInput] - Input parser expects ZodObject');
  });

  test('with query non-object-string-value input', () => {
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
    }).toThrowError('[query.badInput] - Input parser expects ZodObject<{ [string]: ZodString }>');
  });

  describe('with bad method', () => {
    test('query', () => {
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
    });

    test('mutation', () => {
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
    });
  });

  describe('duplicate routes', () => {
    test('matching', () => {
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
    });

    test('trailing slash', () => {
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
    });
  });

  test('unsupported subscription', () => {
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

  test('with valid procedures', () => {
    const appRouter = trpc
      .router<any, OpenApiMeta>()
      .mutation('createUser', {
        meta: { openapi: { enabled: true, path: '/users', method: 'POST' } },
        input: z.object({ name: z.string() }),
        output: z.object({ id: z.string(), name: z.string() }),
        resolve: ({ input }) => ({ id: 'user-id', name: input.name }),
      })
      .query('readUser', {
        meta: { openapi: { enabled: true, path: '/users', method: 'GET' } },
        input: z.object({ id: z.string() }),
        output: z.object({ id: z.string(), name: z.string() }),
        resolve: ({ input }) => ({ id: input.id, name: 'name' }),
      })
      .mutation('updateUser', {
        meta: { openapi: { enabled: true, path: '/users', method: 'PATCH' } },
        input: z.object({ id: z.string(), name: z.string().optional() }),
        output: z.object({ id: z.string(), name: z.string() }),
        resolve: ({ input }) => ({ id: input.id, name: input.name || 'name' }),
      })
      .query('deleteUser', {
        meta: { openapi: { enabled: true, path: '/users', method: 'DELETE' } },
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
            "delete": Object {
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "id",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                  "style": "form",
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
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "id",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                  "style": "form",
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
              "requestBody": Object {
                "content": Object {
                  "application/json": Object {
                    "schema": Object {
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
            "post": Object {
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

  describe('with falsey outputs', () => {
    const appRouter = trpc
      .router<any, OpenApiMeta>()
      .mutation('void', {
        meta: { openapi: { enabled: true, path: '/void', method: 'POST' } },
        input: z.void(),
        output: z.void(),
        resolve: () => undefined,
      })
      .mutation('null', {
        meta: { openapi: { enabled: true, path: '/null', method: 'POST' } },
        input: z.null(),
        output: z.null(),
        resolve: () => undefined,
      })
      .mutation('undefined', {
        meta: { openapi: { enabled: true, path: '/undefined', method: 'POST' } },
        input: z.undefined(),
        output: z.undefined(),
        resolve: () => undefined,
      })
      .mutation('optional', {
        meta: { openapi: { enabled: true, path: '/optional', method: 'POST' } },
        input: z.string().optional(),
        output: z.string().optional(),
        resolve: () => undefined,
      })
      .mutation('nullish', {
        meta: { openapi: { enabled: true, path: '/nullish', method: 'POST' } },
        input: z.string().nullish(),
        output: z.string().nullish(),
        resolve: () => undefined,
      });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/void']!.get!.parameters).toMatchInlineSnapshot(``);
    expect(openApiDocument.paths['/void']!.get!.responses[200]).toMatchInlineSnapshot(``);
  });

  describe('with null', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('null', {
      meta: { openapi: { enabled: true, path: '/null', method: 'POST' } },
      input: z.null(),
      output: z.null(),
      resolve: () => undefined,
    });

    const openApiDocument = generateOpenApiDocument(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      baseUrl: 'http://localhost:3000/api',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument.paths['/null']!.get!.parameters).toMatchInlineSnapshot(``);
    expect(openApiDocument.paths['/null']!.get!.responses[200]).toMatchInlineSnapshot(``);
  });

  describe('with undefined', () => {
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
    expect(openApiDocument.paths['/undefined']!.get!.parameters).toMatchInlineSnapshot(``);
    expect(openApiDocument.paths['/undefined']!.get!.responses[200]).toMatchInlineSnapshot(``);
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
          "explode": true,
          "in": "query",
          "name": "age",
          "required": true,
          "schema": Object {
            "type": "string",
          },
          "style": "form",
        },
      ]
    `);
  });

  test('with summary & tags', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('all.metadata', {
      meta: {
        openapi: {
          enabled: true,
          path: '/metadata/all',
          method: 'GET',
          summary: 'Some summary',
          tags: ['some-tag'],
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
    expect(openApiDocument.paths['/metadata/all']!.get!.summary).toBe('Some summary');
    expect(openApiDocument.paths['/metadata/all']!.get!.tags).toEqual(['some-tag']);
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
});
