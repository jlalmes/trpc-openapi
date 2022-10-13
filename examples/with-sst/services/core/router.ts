import { TRPCError, initTRPC } from '@trpc/server';
import { APIGatewayEvent, CreateAWSLambdaContextOptions } from '@trpc/server/adapters/aws-lambda';
import jwt from 'jsonwebtoken';
import { OpenApiMeta } from 'trpc-openapi';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { Post, PostEntity, User, UserEntity } from './database';

// This should be done using Config.Secret
// but to keep the example simple we're using a hardcoded secret
// https://docs.sst.dev/environment-variables#quick-start-1
const jwtSecret = 'super-secret-phrase';

export type Context = {
  user: User | null;
  requestId: string;
};

const t = initTRPC
  .context<Context>()
  .meta<OpenApiMeta>()
  .create({
    errorFormatter: ({ error, shape }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR' && process.env.NODE_ENV === 'production') {
        return { ...shape, message: 'Internal server error' };
      }
      return shape;
    },
  });

export const createContext = async ({
  event,
}: CreateAWSLambdaContextOptions<APIGatewayEvent>): Promise<Context> => {
  const requestId = uuid();

  let user: User | null = null;

  try {
    if (event.headers.authorization) {
      const token = event.headers.authorization.split(' ')[1];
      const userId = jwt.verify(token, jwtSecret) as string;
      if (userId) {
        const { data } = await UserEntity.get({
          id: userId,
        }).go();

        if (data) user = data;
      }
    }
  } catch (cause) {
    console.error(cause);
  }

  return { user, requestId };
};

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      message: 'User not found',
      code: 'UNAUTHORIZED',
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const authRouter = t.router({
  register: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/register',
        tags: ['auth'],
        summary: 'Register as a new user',
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        passcode: z.string().regex(/^[0-9]{4}$/),
        name: z.string().min(3),
      }),
    )
    .output(
      z.object({
        user: z.object({
          id: z.string().uuid(),
          email: z.string().email(),
          name: z.string().min(3),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { data: existingUser } = await UserEntity.query
        .email({
          email: input.email,
        })
        .go();

      if (existingUser.length) {
        throw new TRPCError({
          message: 'User with email already exists',
          code: 'UNAUTHORIZED',
        });
      }

      const { data: user } = await UserEntity.create(input).go();

      return { user };
    }),
  login: publicProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/auth/login',
        tags: ['auth'],
        summary: 'Login as an existing user',
      },
    })
    .input(
      z.object({
        email: z.string().email(),
        passcode: z.string().regex(/^[0-9]{4}$/),
      }),
    )
    .output(
      z.object({
        token: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data } = await UserEntity.query
        .email({
          email: input.email,
        })
        .go();

      if (!data.length) {
        throw new TRPCError({
          message: 'User with email not found',
          code: 'UNAUTHORIZED',
        });
      }

      const user = data[0];

      if (user.passcode !== input.passcode) {
        throw new TRPCError({
          message: 'Passcode was incorrect',
          code: 'UNAUTHORIZED',
        });
      }

      return {
        token: jwt.sign(user.id, jwtSecret),
      };
    }),
});

const usersRouter = t.router({
  getUsers: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/users',
        tags: ['users'],
        summary: 'Read all users',
      },
    })
    .input(
      z.object({
        cursor: z.string().optional(),
      }),
    )
    .output(
      z.object({
        cursor: z.string().nullish(),
        users: z.array(
          z.object({
            id: z.string().uuid(),
            email: z.string().email(),
            name: z.string(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      const { data: users, cursor } = await UserEntity.scan.go({ cursor: input.cursor });

      return { users, cursor };
    }),
  getUserById: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/users/{id}',
        tags: ['users'],
        summary: 'Read a user by id',
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        user: z.object({
          id: z.string().uuid(),
          email: z.string().email(),
          name: z.string(),
        }),
      }),
    )
    .query(async ({ input }) => {
      const { data: user } = await UserEntity.get({ id: input.id }).go();

      if (!user) {
        throw new TRPCError({
          message: 'User not found',
          code: 'NOT_FOUND',
        });
      }

      return { user };
    }),
});

const postsRouter = t.router({
  getPosts: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/posts',
        tags: ['posts'],
        summary: 'Read all posts',
      },
    })
    .input(
      z.object({
        cursor: z.string().optional(),
        userId: z.string().uuid().optional(),
      }),
    )
    .output(
      z.object({
        posts: z.array(
          z.object({
            id: z.string().uuid(),
            content: z.string(),
            userId: z.string().uuid(),
          }),
        ),
      }),
    )
    .query(async ({ input }) => {
      if (!input.userId) {
        const { data: posts, cursor } = await PostEntity.scan.go({ cursor: input.cursor });
        return { posts, cursor };
      }

      const { data: posts, cursor } = await PostEntity.query
        .user({
          userId: input.userId,
        })
        .go({ cursor: input.cursor });

      return { posts, cursor };
    }),
  getPostById: publicProcedure
    .meta({
      openapi: {
        method: 'GET',
        path: '/posts/{id}',
        tags: ['posts'],
        summary: 'Read a post by id',
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .output(
      z.object({
        post: z.object({
          id: z.string().uuid(),
          content: z.string(),
          userId: z.string().uuid(),
        }),
      }),
    )
    .query(async ({ input }) => {
      const { data: post } = await PostEntity.get({
        id: input.id,
      }).go();

      if (!post) {
        throw new TRPCError({
          message: 'Post not found',
          code: 'NOT_FOUND',
        });
      }

      return { post };
    }),
  createPost: protectedProcedure
    .meta({
      openapi: {
        method: 'POST',
        path: '/posts',
        tags: ['posts'],
        protect: true,
        summary: 'Create a new post',
      },
    })
    .input(
      z.object({
        content: z.string().min(1).max(140),
      }),
    )
    .output(
      z.object({
        post: z.object({
          id: z.string().uuid(),
          content: z.string(),
          userId: z.string().uuid(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { data: post } = await PostEntity.create({
        content: input.content,
        userId: ctx.user.id,
      }).go();

      return { post };
    }),
  updatePostById: protectedProcedure
    .meta({
      openapi: {
        method: 'PUT',
        path: '/posts/{id}',
        tags: ['posts'],
        protect: true,
        summary: 'Update an existing post',
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
        content: z.string().min(1),
      }),
    )
    .output(
      z.object({
        post: z.object({
          id: z.string().uuid(),
          content: z.string(),
          userId: z.string().uuid(),
        }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { data: post } = await PostEntity.get({
        id: input.id,
      }).go();

      if (!post) {
        throw new TRPCError({
          message: 'Post not found',
          code: 'NOT_FOUND',
        });
      }

      if (post.userId !== ctx.user.id) {
        throw new TRPCError({
          message: 'Cannot edit post owned by other user',
          code: 'FORBIDDEN',
        });
      }

      const { data } = await PostEntity.patch({
        id: input.id,
      })
        .set({
          content: input.content,
        })
        .go({
          response: 'all_new',
        });

      return { post: data as Required<Post> };
    }),
  deletePostById: protectedProcedure
    .meta({
      openapi: {
        method: 'DELETE',
        path: '/posts/{id}',
        tags: ['posts'],
        protect: true,
        summary: 'Delete a post',
      },
    })
    .input(
      z.object({
        id: z.string().uuid(),
      }),
    )
    .output(z.null())
    .mutation(async ({ input, ctx }) => {
      const { data: post } = await PostEntity.get({
        id: input.id,
      }).go();

      if (!post) {
        throw new TRPCError({
          message: 'Post not found',
          code: 'NOT_FOUND',
        });
      }

      if (post.userId !== ctx.user.id) {
        throw new TRPCError({
          message: 'Cannot delete post owned by other user',
          code: 'FORBIDDEN',
        });
      }

      await PostEntity.delete({
        id: input.id,
      }).go();

      return null;
    }),
});

export const appRouter = t.router({
  auth: authRouter,
  users: usersRouter,
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;
