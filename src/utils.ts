// eslint-disable-next-line import/no-unresolved
import { Procedure } from '@trpc/server/dist/declarations/src/internals/procedure';
import { z } from 'zod';

// `inputParser` & `outputParser` are private so this is a hack to access it
export const getInputOutputParsers = (procedure: Procedure<any, any, any, any, any, any, any>) => {
  return procedure as unknown as {
    inputParser: typeof procedure['inputParser'];
    outputParser: typeof procedure['outputParser'];
  };
};

export const normalizePath = (path: string) => {
  return `/${path.replace(/^\/|\/$/g, '')}`;
};

export const getPathParameters = (path: string) => {
  return Array.from(path.matchAll(/\{(.+?)\}/g)).map(([_, key]) => key!);
};

export const getPathRegExp = (path: string) => {
  const groupedExp = path.replace(/\{(.+?)\}/g, (_, key: string) => `(?<${key}>[^/]+)`);
  return new RegExp(`^${groupedExp}$`, 'i');
};

export const instanceofZod = (type: any): type is z.ZodType => {
  return !!type?._def?.typeName;
};

export const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  type: any,
  zodTypeKind: Z,
): type is InstanceType<typeof z[Z]> => {
  return type?._def?.typeName === zodTypeKind;
};
