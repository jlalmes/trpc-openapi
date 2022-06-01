// eslint-disable-next-line import/no-unresolved
import { Procedure } from '@trpc/server/dist/declarations/src/internals/procedure';

export const getPath = (raw: string) => {
  const path = `/${raw.replace(/^\/|\/$/g, '')}`;
  const pathParameters = Array.from(path.matchAll(/\{(\w+)\}/g)).map((matchArray) => {
    return matchArray[1]!;
  });
  return { path, pathParameters };
};

// `inputParser` & `outputParser` are private so this is a hack to access it
export const getInputOutputParsers = (procedure: Procedure<any, any, any, any, any, any, any>) => {
  return procedure as unknown as {
    inputParser: typeof procedure['inputParser'];
    outputParser: typeof procedure['outputParser'];
  };
};
