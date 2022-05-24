export type User = {
  id: string;
  email: string;
  passcode: string;
  name: string;
};

export type Post = {
  id: string;
  content: string;
  userId: string;
};

export type Database = {
  users: User[];
  posts: Post[];
};

export const database: Database = {
  users: [],
  posts: [],
};
