export type User = {
  id: `usr_${string}`;
  email: string;
  pass: string;
  name: string;
};

export type Post = {
  id: `pst_${string}`;
  title: string;
  userId: User['id'];
};
