import { Post, User } from './types';

export type Database = {
  users: User[];
  posts: Post[];
};

export const database: Database = {
  users: [],
  posts: [],
};
