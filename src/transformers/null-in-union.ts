import { JSONSchema4 } from 'json-schema';

/**
 * Schemas may define a type as a union of types with one of the types being `null`.
 * This is the same as defining an optional type.
 */
function removeNull(def: JSONSchema4, combinator: 'anyOf' | 'oneOf'): JSONSchema4 {
  const union = def[combinator];
  if (!(union && Array.isArray(union))) {
    return def;
  }

  const nullType = union.some(t => t.type === 'null');
  const nonNullTypes = new Set(union.filter(t => t.type !== 'null'));

  if (nullType) {
    def.required = false;
  }

  if (nonNullTypes.size === 0) {
    def[combinator] = [{ type: 'null' }];
  } else {
    // if its a union of non null types we just drop null
    def[combinator] = Array.from(nonNullTypes);
  }

  return def;
}


/**
 * Many schemas define a type as an array of types to indicate union types.
 * To avoid having the type generator be aware of that, we transform those types
 * into their corresponding typescript definitions.
 *
 * --------------------------------------------------
 *
 * The null union can be in one of these three fields: type, anyOf or oneOf
 */
export function reduceNullFromUnions(def: JSONSchema4): JSONSchema4 {
  const transformers: Array<(definition: JSONSchema4) => JSONSchema4> = [
    (d: JSONSchema4) => removeNull(d, 'anyOf'),
    (d: JSONSchema4) => removeNull(d, 'oneOf'),
  ];

  return transformers.reduce((input, transform) => transform(input), def);
}
