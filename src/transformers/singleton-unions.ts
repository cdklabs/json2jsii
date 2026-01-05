import { JSONSchema4 } from 'json-schema';
import { removeUnions, safeSelectUnion } from './util';

/**
 * Schemas may define a type as a union of types with one of the types being `null`.
 * This is the same as defining an optional type.
 */
export function hoistSingletonUnions(def: JSONSchema4): JSONSchema4 {
  // definitions already has a type, can't hoist up
  if (def.type) {
    return def;
  }

  // cannot safely select a union or the union is not a singleton => we can't hoist up
  const union = safeSelectUnion(def);
  if (!union || union.length > 1) {
    return def;
  }

  // hoist then the only union element up
  const hoisted = union[0];
  removeUnions(def);
  delete def.type;
  Object.assign(def, hoisted);
  return def;
}
