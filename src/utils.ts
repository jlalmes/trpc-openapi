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

export const instanceofZod = (type: any): type is z.ZodTypeAny => {
  return !!type?._def?.typeName;
};

export const instanceofZodTypeKind = <Z extends z.ZodFirstPartyTypeKind>(
  type: z.ZodTypeAny,
  zodTypeKind: Z,
): type is InstanceType<typeof z[Z]> => {
  return type?._def?.typeName === zodTypeKind;
};

export const instanceofZodTypeLikeVoid = (type: z.ZodTypeAny): boolean => {
  return (
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodVoid) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodUndefined) ||
    instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodNever)
  );
};

export const instanceofZodTypeLikeObject = (
  type: z.ZodTypeAny,
): type is z.ZodObject<z.ZodRawShape> => {
  return instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodObject);
};

export const instanceofZodTypeLikeString = (type: z.ZodTypeAny): boolean => {
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodOptional)) {
    return instanceofZodTypeLikeString(type.unwrap());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodDefault)) {
    return instanceofZodTypeLikeString(type.removeDefault());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEffects)) {
    return instanceofZodTypeLikeString(type.innerType());
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodEnum)) {
    return !type._def.values.some((value) => typeof value !== 'string');
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodNativeEnum)) {
    return !Object.values(type._def.values).some((value) => typeof value !== 'string');
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodLiteral)) {
    return typeof type._def.value === 'string';
  }
  if (instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodUnion)) {
    return !type._def.options.some((option) => !instanceofZodTypeLikeString(option));
  }
  return instanceofZodTypeKind(type, z.ZodFirstPartyTypeKind.ZodString);
};
