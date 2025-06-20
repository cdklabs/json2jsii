import { JSONSchema4 } from 'json-schema';

/**
 * Schemas may define a type as a union of types with one of the types being `null`.
 * This is the same as defining an optional type.
 */
export function hoistSingletonUnions(def: JSONSchema4): JSONSchema4 {
  // definitions already has a type, can't hoist up
  if (def.type) {
    return def;
  }

  // if we have more than one of anyOf, oneOf, or allOf, behavior is undefined and we can't hoist up
  const hasAnyOf = Boolean(def.anyOf);
  const hasOneOf = Boolean(def.oneOf);
  const hasAllOf = Boolean(def.allOf);
  if ([hasAnyOf, hasOneOf, hasAllOf].filter(value => value === true).length > 1) {
    return def;
  }

  // select the union in question
  const union = def.anyOf || def.oneOf || def.allOf;

  // if the union is not an array or not a singleton, we can't hoist up
  if (!Array.isArray(union) || union.length > 1) {
    return def;
  }

  // hoist then the only union element up
  const hoisted = union[0];
  delete def.anyOf;
  delete def.oneOf;
  delete def.allOf;
  delete def.type;
  Object.assign(def, hoisted);
  return def;
}
