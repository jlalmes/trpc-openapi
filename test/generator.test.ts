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
      description: 'This is the OpenAPI v3 documentation for the tRPC API',
      baseUrl: 'http://localhost:3000/api',
      docsUrl: 'http://localhost:3000/docs',
    });

    expect(openApiSchemaValidator.validate(openApiDocument).errors).toEqual([]);
    expect(openApiDocument).toMatchInlineSnapshot(`
      Object {
        "components": Object {
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
          "description": "This is the OpenAPI v3 documentation for the tRPC API",
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

  test('query with missing input', () => {
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
    }).toThrowError('[query.noInput] - Input parser expects ZodObject or ZodVoid');
  });

  test('mutation with missing input', () => {
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
    }).toThrowError('[mutation.noInput] - Input parser expects ZodSchema');
  });

  test('query procedure with missing output', () => {
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
    }).toThrowError('[query.noOutput] - Output parser expects ZodSchema');
  });

  test('mutation procedure with missing output', () => {
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
    }).toThrowError('[mutation.noOutput] - Output parser expects ZodSchema');
  });

  test('query procedure with non-object input', () => {
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
    }).toThrowError('[query.badInput] - Input parser expects ZodObject or ZodVoid');
  });

  test('query procedure with non-string-value-object input', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('badInput', {
      meta: { openapi: { enabled: true, path: '/bad-input', method: 'GET' } },
      input: z.object({ age: z.number() }),
      output: z.object({ age: z.number() }),
      resolve: ({ input }) => ({ age: input.age }),
    });

    expect(() => {
      generateOpenApiDocument(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[query.badInput] - Input parser expects ZodObject<{ [string]: ZodString }>');
  });

  test('query procedure with bad method', () => {
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

  test('mutation procedure with bad method', () => {
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

  test('duplicate route', () => {
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

  test('duplicate route with trailing slash', () => {
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
              "description": undefined,
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
                                  "properties": Object {},
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
              "security": undefined,
              "tags": undefined,
            },
            "get": Object {
              "description": undefined,
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
                                  "properties": Object {},
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
              "security": undefined,
              "tags": undefined,
            },
            "patch": Object {
              "description": undefined,
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
                                  "properties": Object {},
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
              "security": undefined,
              "tags": undefined,
            },
            "post": Object {
              "description": undefined,
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
                                  "properties": Object {},
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
              "security": undefined,
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
    const appRouter = trpc.router<any, OpenApiMeta>().query('void', {
      meta: { openapi: { enabled: true, path: '/void', method: 'GET' } },
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
    expect(openApiDocument.paths['/void']!.get!.parameters).toBe(undefined);
    expect(openApiDocument.paths['/void']!.get!.responses[200]).toMatchInlineSnapshot(`
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

  test('with description & tags', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().query('all.metadata', {
      meta: {
        openapi: {
          enabled: true,
          path: '/metadata/all',
          method: 'GET',
          description: 'Some description',
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
    expect(openApiDocument.paths['/metadata/all']!.get!.description).toBe('Some description');
    expect(openApiDocument.paths['/metadata/all']!.get!.tags).toEqual(['some-tag']);
  });

  test('with security', () => {
    const appRouter = trpc.router<any, OpenApiMeta>().mutation('protectedEndpoint', {
      meta: {
        openapi: {
          enabled: true,
          path: '/secure/endpoint',
          method: 'POST',
          secure: true,
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
