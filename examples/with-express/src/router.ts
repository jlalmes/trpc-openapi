import * as trpc from '@trpc/server';
import { TRPCError } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { OpenApiMeta } from 'trpc-openapi';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

import { Post, User, database } from './database';

const jwtSecret = uuid();

export type Context = {
  user: User | null;
  requestId: string;
};

export const createContext = async ({
  req,
  res,
}: // eslint-disable-next-line @typescript-eslint/require-await
CreateExpressContextOptions): Promise<Context> => {
  const requestId = uuid();
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

const createProtectedRouter = () => {
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
    meta: {
      openapi: {
        enabled: true,
        method: 'POST',
        path: '/auth/register',
        tag: 'auth',
        summary: 'Register as a new user',
      },
    },
    input: z.object({
      email: z.string().email(),
      passcode: z.string().regex(/^[0-9]{4}$/),
      name: z.string().min(3),
    }),
    output: z.object({
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
        name: z.string().min(3),
      }),
    }),
    resolve: ({ input }) => {
      let user = database.users.find((_user) => _user.email === input.email);

      if (user) {
        throw new TRPCError({
          message: 'User with email already exists',
          code: 'UNAUTHORIZED',
        });
      }

      user = {
        id: uuid(),
        email: input.email,
        passcode: input.passcode,
        name: input.name,
      };

      database.users.push(user);

      return { user: { id: user.id, email: user.email, name: user.name } };
    },
  })
  .mutation('login', {
    meta: {
      openapi: {
        enabled: true,
        method: 'POST',
        path: '/auth/login',
        tag: 'auth',
        summary: 'Login as an existing user',
      },
    },
    input: z.object({
      email: z.string().email(),
      passcode: z.string().regex(/^[0-9]{4}$/),
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
      if (user.passcode !== input.passcode) {
        throw new TRPCError({
          message: 'Passcode was incorrect',
          code: 'UNAUTHORIZED',
        });
      }

      return {
        token: jwt.sign(user.id, jwtSecret),
      };
    },
  });

const usersRouter = createRouter()
  .query('getUsers', {
    meta: {
      openapi: {
        enabled: true,
        method: 'GET',
        path: '/users',
        tag: 'users',
        summary: 'Read all users',
      },
    },
    input: z.void(),
    output: z.object({
      users: z.array(
        z.object({
          id: z.string().uuid(),
          email: z.string().email(),
          name: z.string(),
        }),
      ),
    }),
    resolve: () => {
      const users = database.users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
      }));

      return { users };
    },
  })
  .query('getUserById', {
    meta: {
      openapi: {
        enabled: true,
        method: 'GET',
        path: '/users/{id}',
        tag: 'users',
        summary: 'Read a user by id',
      },
    },
    input: z.object({
      id: z.string().uuid(),
    }),
    output: z.object({
      user: z.object({
        id: z.string().uuid(),
        email: z.string().email(),
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

const postsRouter = createRouter()
  .query('getPosts', {
    meta: {
      openapi: {
        enabled: true,
        method: 'GET',
        path: '/posts',
        tag: 'posts',
        summary: 'Read all posts',
      },
    },
    input: z.object({
      userId: z.string().uuid().optional(),
    }),
    output: z.object({
      posts: z.array(
        z.object({
          id: z.string().uuid(),
          content: z.string(),
          userId: z.string().uuid(),
        }),
      ),
    }),
    resolve: ({ input }) => {
      let posts: Post[] = database.posts;

      if (input.userId) {
        posts = posts.filter((post) => {
          return post.userId === input.userId;
        });
      }

      return { posts };
    },
  })
  .query('getPostById', {
    meta: {
      openapi: {
        enabled: true,
        method: 'GET',
        path: '/posts/{id}',
        tag: 'posts',
        summary: 'Read a post by id',
      },
    },
    input: z.object({
      id: z.string().uuid(),
    }),
    output: z.object({
      post: z.object({
        id: z.string().uuid(),
        content: z.string(),
        userId: z.string().uuid(),
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
  });

const postsProtectedRouter = createProtectedRouter()
  .mutation('createPost', {
    meta: {
      openapi: {
        enabled: true,
        method: 'POST',
        path: '/posts',
        tag: 'posts',
        protect: true,
        summary: 'Create a new post',
      },
    },
    input: z.object({
      content: z.string().min(1).max(140),
    }),
    output: z.object({
      post: z.object({
        id: z.string().uuid(),
        content: z.string(),
        userId: z.string().uuid(),
      }),
    }),
    resolve: ({ input, ctx }) => {
      const post: Post = {
        id: uuid(),
        content: input.content,
        userId: ctx.user.id,
      };

      database.posts.push(post);

      return { post };
    },
  })
  .mutation('updatePostById', {
    meta: {
      openapi: {
        enabled: true,
        method: 'PUT',
        path: '/posts/{id}',
        tag: 'posts',
        protect: true,
        summary: 'Update an existing post',
      },
    },
    input: z.object({
      id: z.string().uuid(),
      content: z.string().min(1),
    }),
    output: z.object({
      post: z.object({
        id: z.string().uuid(),
        content: z.string(),
        userId: z.string().uuid(),
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

      post.content = input.content;

      return { post };
    },
  })
  .query('deletePostById', {
    meta: {
      openapi: {
        enabled: true,
        method: 'DELETE',
        path: '/posts/{id}',
        tag: 'posts',
        protect: true,
        summary: 'Delete a post',
      },
    },
    input: z.object({
      id: z.string().uuid(),
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

export const appRouter = createRouter()
  .merge(authRouter)
  .merge(usersRouter)
  .merge(postsRouter)
  .merge(postsProtectedRouter);

export type AppRouter = typeof appRouter;
