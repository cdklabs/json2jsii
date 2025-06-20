import { JSONSchema4 } from 'json-schema';

type Union = 'anyOf' | 'oneOf' | 'allOf';

/**
 * Safely selects a union type if exactly one union type is defined.
 *
 * @returns the selected union type or undefined if no union type is defined or if more than one union type is defined
 */
export function safeSelectUnion(def: JSONSchema4, allow: Union[] = ['anyOf', 'oneOf', 'allOf']): JSONSchema4[] | undefined {
  // Ensure we have exactly one of the possible unions, otherwise behavior is undefined
  const union = exactlyOneUnion(def, allow);
  if (!union) {
    return undefined;
  }

  // select the union in question
  const unionDef = def[union!];

  // if the union is not an array something is wrong
  if (!Array.isArray(unionDef)) {
    return undefined;
  }

  return unionDef;
}

/**
 * Returns the name of the union type if exactly one union type is defined.
 */
export function exactlyOneUnion(def: JSONSchema4, allow: Union[] = ['anyOf', 'oneOf', 'allOf']): Union | undefined {
  // check we have exactly one of the allowed union types
  const count = allow.reduce((sum, union) => sum + (def[union] ? 1 : 0), 0);
  if (count !== 1) {
    return undefined;
  }

  // find the name of the union we have and return
  return allow.find((union) => Boolean(def[union]));
}

/**
 * Removes any of the union types from the schema.
 */
export function removeUnions(def: JSONSchema4, allow: Union[] = ['anyOf', 'oneOf', 'allOf']): JSONSchema4 {
  allow.forEach((union) => delete def[union]);
  return def;
}
