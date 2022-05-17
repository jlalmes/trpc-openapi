import * as trpc from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { OpenApiMeta } from 'trpc-openapi';
import { z } from 'zod';

import { database } from './database';
import { Post, User } from './types';

const jwtSecret = `jwt_${nanoid()}`;

export type Context = {
  user: User | null;
  requestId: `req_${string}`;
};

// eslint-disable-next-line @typescript-eslint/require-await
export const createContext = async ({ req, res }: CreateNextContextOptions): Promise<Context> => {
  const requestId = `req_${nanoid()}` as const;
  res.setHeader('x-request-id', requestId);

  let user: User | null = null;

  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      const userId = jwt.verify(token, jwtSecret) as string;
      if (userId) {
        user = database.users.find((_user) => _user.id === userId) ?? null;
      }
    }
  } catch (cause) {
    console.error(cause);
  }

  return { user, requestId };
};

const createRouter = () => {
  return trpc.router<Context, OpenApiMeta>();
};

const createSecureRouter = () => {
  return createRouter().middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        message: 'User not found',
        code: 'UNAUTHORIZED',
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
};

const authRouter = createRouter()
  .mutation('register', {
    meta: { openapi: { enabled: true, method: 'POST', path: '/auth/register', tags: ['auth'] } },
    input: z.object({
      email: z.string(),
      pass: z.string(),
      name: z.string(),
    }),
    output: z.object({
      user: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
      }),
    }),
    resolve: ({ input }) => {
      const user: User = {
        id: `usr_${nanoid()}` as const,
        email: input.email,
        pass: input.pass,
        name: input.name,
      };

      database.users.push(user);

      return { user: { id: user.id, email: user.email, name: user.name } };
    },
  })
  .mutation('login', {
    meta: { openapi: { enabled: true, method: 'POST', path: '/auth/login', tags: ['auth'] } },
    input: z.object({
      email: z.string(),
      pass: z.string(),
    }),
    output: z.object({
      token: z.string(),
    }),
    resolve: ({ input }) => {
      const user = database.users.find((_user) => _user.email === input.email);

      if (!user) {
        throw new TRPCError({
          message: 'User with email not found',
          code: 'UNAUTHORIZED',
        });
      }
      if (user.pass !== input.pass) {
        throw new TRPCError({
          message: 'Pass was incorrect',
          code: 'UNAUTHORIZED',
        });
      }

      return {
        token: jwt.sign(user.id, jwtSecret),
      };
    },
  });

const postRouter = createRouter()
  .query('getPost', {
    meta: { openapi: { enabled: true, method: 'GET', path: '/post', tags: ['posts'] } },
    input: z.object({
      id: z.string(),
    }),
    output: z.object({
      post: z.object({
        id: z.string(),
        title: z.string(),
        userId: z.string(),
      }),
    }),
    resolve: ({ input }) => {
      const post = database.posts.find((_post) => _post.id === input.id);

      if (!post) {
        throw new TRPCError({
          message: 'Post not found',
          code: 'NOT_FOUND',
        });
      }

      return { post };
    },
  })
  .query('getAllPosts', {
    meta: { openapi: { enabled: true, method: 'GET', path: '/posts', tags: ['posts'] } },
    input: z.object({}),
    output: z.object({
      posts: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          userId: z.string(),
        }),
      ),
    }),
    resolve: () => {
      return { posts: database.posts };
    },
  });

const postSecureRouter = createSecureRouter()
  .mutation('createPost', {
    meta: {
      openapi: { enabled: true, method: 'POST', path: '/post', tags: ['posts'], secure: true },
    },
    input: z.object({
      title: z.string().min(1),
    }),
    output: z.object({
      post: z.object({
        id: z.string(),
        title: z.string(),
        userId: z.string(),
      }),
    }),
    resolve: ({ input, ctx }) => {
      const post: Post = {
        id: `pst_${nanoid()}`,
        title: input.title,
        userId: ctx.user.id,
      };

      database.posts.push(post);

      return { post };
    },
  })
  .mutation('updatePost', {
    meta: {
      openapi: { enabled: true, method: 'PUT', path: '/post', tags: ['posts'], secure: true },
    },
    input: z.object({
      id: z.string(),
      title: z.string().min(1),
    }),
    output: z.object({
      post: z.object({
        id: z.string(),
        title: z.string(),
        userId: z.string(),
      }),
    }),
    resolve: ({ input, ctx }) => {
      const post = database.posts.find((_post) => _post.id === input.id);

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

      post.title = input.title;

      return { post };
    },
  })
  .query('deletePost', {
    meta: {
      openapi: { enabled: true, method: 'DELETE', path: '/post', tags: ['posts'], secure: true },
    },
    input: z.object({
      id: z.string(),
    }),
    output: z.null(),
    resolve: ({ input, ctx }) => {
      const post = database.posts.find((_post) => _post.id === input.id);

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

      database.posts = database.posts.filter((_post) => _post !== post);

      return null;
    },
  });

const userRouter = createRouter().query('getUser', {
  meta: { openapi: { enabled: true, method: 'GET', path: '/user', tags: ['users'] } },
  input: z.object({
    id: z.string(),
  }),
  output: z.object({
    user: z.object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
    }),
  }),
  resolve: ({ input }) => {
    const user = database.users.find((_user) => _user.id === input.id);

    if (!user) {
      throw new TRPCError({
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return { user };
  },
});

export const appRouter = createRouter()
  .merge(authRouter)
  .merge(postRouter)
  .merge(postSecureRouter)
  .merge(userRouter);

export type AppRouter = typeof appRouter;
