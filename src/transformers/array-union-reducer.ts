import { JSONSchema4 } from 'json-schema';
import { removeUnions, safeSelectUnion } from './util';

/**
 * When a schema defines a union between an array type and its element type,
 * we can simplify it to just the array type since in jsii this would be 'any' anyway.
 * For example: string | string[] becomes just string[]
 */
export function reduceArrayUnions(def: JSONSchema4): JSONSchema4 {
  // bail if we cannot safely select a union or the union is not a tuple
  const union = safeSelectUnion(def);
  if (!union || union.length !== 2) {
    return def;
  }

  // Look for a pattern where one type is an array and the other is its element type
  const arrayType = union.find(t => t.type === 'array');
  const elementType = union.find(t => t !== arrayType);

  // bail, if we don't match the required pattern
  if (!arrayType || !elementType || !arrayType.items) {
    return def;
  }

  // Check if the element type matches the array items type
  if (JSON.stringify(arrayType.items) === JSON.stringify(elementType)) {
    // Replace the union with just the array type
    removeUnions(def);
    delete def.type;
    Object.assign(def, arrayType);
  }

  return def;
}
