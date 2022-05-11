import * as trpc from '@trpc/server';
import OpenAPISchemaValidator from 'openapi-schema-validator';
import { z } from 'zod';

import { generateOpenAPISchema, openAPIVersion } from '../src/generator';
import type { OpenAPIMeta } from '../src/types';

const openAPISchemaValidator = new OpenAPISchemaValidator({
  version: openAPIVersion,
});

describe('OpenAPI schema generator', () => {
  test('empty router', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>();

    const openAPISchema = generateOpenAPISchema(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      description: 'This is the OpenAPI v3 documentation for the tRPC API',
      baseUrl: 'http://localhost:3000/api',
      docsUrl: 'http://localhost:3000/docs',
    });

    expect(openAPISchemaValidator.validate(openAPISchema).errors).toEqual([]);
    expect(openAPISchema).toMatchInlineSnapshot(`
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

  test('procedure with missing input', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().query('noInput', {
      meta: { openapi: { enabled: true } },
      output: z.object({ name: z.string() }),
      resolve: () => ({ name: 'jlalmes' }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[queries.noInput] - Input parser is required and must be instance of ZodType');
  });

  test('procedure with missing input', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().mutation('noInput', {
      meta: { openapi: { enabled: true } },
      output: z.object({ name: z.string() }),
      resolve: () => ({ name: 'jlalmes' }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError(
      '[mutations.noInput] - Input parser is required and must be instance of ZodType',
    );
  });

  test('query procedure with missing output', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().query('noOutput', {
      meta: { openapi: { enabled: true } },
      input: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError(
      '[queries.noOutput] - Output parser is required and must be instance of ZodType',
    );
  });

  test('mutation procedure with missing output', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().mutation('noOutput', {
      meta: { openapi: { enabled: true } },
      input: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError(
      '[mutations.noOutput] - Output parser is required and must be instance of ZodType',
    );
  });

  test('query procedure with non-object input', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().query('stringInput', {
      meta: { openapi: { enabled: true } },
      input: z.string(),
      output: z.object({ name: z.string() }),
      resolve: () => ({ name: 'jlalmes' }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[queries.stringInput] - Query input parser must be instance of ZodObject');
  });

  test('query procedure with non-string-value-object input', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().query('objectNumberInput', {
      meta: { openapi: { enabled: true } },
      input: z.object({ age: z.number() }),
      output: z.object({ age: z.number() }),
      resolve: ({ input }) => ({ age: input.age }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError(
      '[queries.objectNumberInput] - Query input parser object values must be instance of ZodString',
    );
  });

  test('query procedure with bad method', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().query('postQuery', {
      meta: {
        openapi: {
          enabled: true,
          method: 'POST',
        },
      },
      input: z.object({ name: z.string() }),
      output: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[queries.postQuery] - Query procedures can only use GET or DELETE methods');
  });

  test('mutation procedure with bad method', () => {
    const appRouter = trpc.router<any, OpenAPIMeta>().mutation('deleteMutation', {
      meta: {
        openapi: {
          enabled: true,
          method: 'DELETE',
        },
      },
      input: z.object({ name: z.string() }),
      output: z.object({ name: z.string() }),
      resolve: ({ input }) => ({ name: input.name }),
    });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError(
      '[mutations.deleteMutation] - Mutation procedures can only use POST, PATCH or PUT methods',
    );
  });

  test('duplicate procedure for method & route', () => {
    const appRouter = trpc
      .router<any, OpenAPIMeta>()
      .query('get', {
        meta: { openapi: { enabled: true } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      })
      .query('GET', {
        meta: { openapi: { enabled: true } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      });

    expect(() => {
      generateOpenAPISchema(appRouter, {
        title: 'tRPC OpenAPI',
        version: '1.0.0',
        baseUrl: 'http://localhost:3000/api',
      });
    }).toThrowError('[queries.GET] - Duplicate procedure definition for route GET /get');
  });

  test('big router', () => {
    const appRouter = trpc
      .router<any, OpenAPIMeta>()
      .query('trpc-only', {
        input: z.string(),
        resolve: () => ({}),
      })
      .query('query', {
        meta: { openapi: { enabled: true } },
        input: z.object({ first: z.string(), last: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: `${input.first} ${input.last}` }),
      })
      .mutation('mutation', {
        meta: { openapi: { enabled: true } },
        input: z.object({ first: z.string(), last: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: `${input.first} ${input.last}` }),
      })
      .mutation('method-change', {
        meta: { openapi: { enabled: true, method: 'PATCH' } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      })
      .query('slash.separated', {
        meta: { openapi: { enabled: true } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      })
      .query('voidInputOutput', {
        meta: { openapi: { enabled: true } },
        input: z.object({}),
        output: z.void(),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        resolve: ({ input }) => {},
      })
      .query('tags', {
        meta: { openapi: { enabled: true, tags: ['some-tag'] } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      })
      .query('description', {
        meta: { openapi: { enabled: true, description: 'Description of endpoint' } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      })
      .query('isProtected', {
        meta: { openapi: { enabled: true, isProtected: true } },
        input: z.object({ name: z.string() }),
        output: z.object({ name: z.string() }),
        resolve: ({ input }) => ({ name: input.name }),
      });

    const openAPISchema = generateOpenAPISchema(appRouter, {
      title: 'tRPC OpenAPI',
      version: '1.0.0',
      description: 'This is the OpenAPI v3 documentation for the tRPC API',
      baseUrl: 'http://localhost:3000/api',
      docsUrl: 'http://localhost:3000/docs',
    });

    expect(openAPISchemaValidator.validate(openAPISchema).errors).toEqual([]);
    expect(openAPISchema).toMatchInlineSnapshot(`
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
        "paths": Object {
          "/description": Object {
            "get": Object {
              "description": "Description of endpoint",
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "name",
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "tags": undefined,
            },
          },
          "/isprotected": Object {
            "get": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "name",
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "security": Array [
                Object {
                  "Authorization": Array [],
                },
              ],
              "tags": undefined,
            },
          },
          "/method-change": Object {
            "patch": Object {
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "tags": undefined,
            },
          },
          "/mutation": Object {
            "post": Object {
              "description": undefined,
              "requestBody": Object {
                "content": Object {
                  "application/json": Object {
                    "schema": Object {
                      "additionalProperties": false,
                      "properties": Object {
                        "first": Object {
                          "type": "string",
                        },
                        "last": Object {
                          "type": "string",
                        },
                      },
                      "required": Array [
                        "first",
                        "last",
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "tags": undefined,
            },
          },
          "/query": Object {
            "get": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "first",
                  "required": true,
                  "schema": Object {
                    "type": "string",
                  },
                  "style": "form",
                },
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "last",
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "tags": undefined,
            },
          },
          "/slash/separated": Object {
            "get": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "name",
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "tags": undefined,
            },
          },
          "/tags": Object {
            "get": Object {
              "description": undefined,
              "parameters": Array [
                Object {
                  "explode": true,
                  "in": "query",
                  "name": "name",
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
                              "name": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
              "tags": Array [
                "some-tag",
              ],
            },
          },
          "/voidinputoutput": Object {
            "get": Object {
              "description": undefined,
              "parameters": Array [],
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
                              "message": Object {
                                "type": "string",
                              },
                            },
                            "required": Array [
                              "message",
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
});
