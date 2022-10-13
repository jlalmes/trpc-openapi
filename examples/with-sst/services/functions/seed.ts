import { v4 as uuid } from 'uuid';

import { PostEntity, UserEntity } from '../core/database';

export const main = async () => {
  const users = [
    {
      id: uuid(),
      email: 'jb@jamesbe.com',
      passcode: '1234',
      name: 'James',
    },
    {
      id: uuid(),
      email: 'alex@example.com',
      passcode: '9876',
      name: 'Alex',
    },
    { id: uuid(), email: 'sachin@example.com', passcode: '1234', name: 'Sachin' },
  ];
  await UserEntity.put(users).go();

  await PostEntity.put([
    {
      content: 'Hello world',
      userId: users[0].id,
    },
    {
      content: 'tRPC is so awesome',
      userId: users[1].id,
    },
    {
      content: 'Know the ropes',
      userId: users[0].id,
    },
    {
      content: 'Fight fire with fire',
      userId: users[1].id,
    },
    {
      content: 'I ate breakfast today',
      userId: users[0].id,
    },
    {
      content: 'Par for the course',
      userId: users[2].id,
    },
  ]).go();
};
