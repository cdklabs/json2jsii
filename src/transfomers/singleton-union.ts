import { JSONSchema4 } from 'json-schema';

/**
 * Schemas may define a type as a union of types with one of the types being `null`.
 * This is the same as defining an optional type.
 */
export function hoistSingletonUnion(def: JSONSchema4): JSONSchema4 {
  // definitions already has a type, can't hoist up
  if (def.type) {
    return def;
  }

  // if we have both anyOf and oneOf, behavior is undefined and we can't hoist up
  if (Boolean(def.anyOf) == Boolean(def.oneOf)) {
    return def;
  }

  // select the union in question
  const union = def.anyOf || def.oneOf;

  // if the union is not an array or not a singleton, we can't hoist up
  if (!Array.isArray(union) || union.length > 1) {
    return def;
  }

  // hoist then the only union element up
  const hoisted = union[0];
  delete def.anyOf;
  delete def.oneOf;
  delete def.type;
  Object.assign(def, hoisted);
  return def;
}
