import { JSONSchema4 } from 'json-schema';

/**
 * Many schemas define a type as an array of types to indicate union types.
 * To avoid having the type generator be aware of that, we transform those types
 * into their corresponding typescript definitions.
 *
 * --------------------------------------------------
 *
 * Strictly speaking, these definitions are meant to allow the literal 'null' value
 * to be used in addition to the actual types. However, since union types are not supported
 * in jsii, allowing this would mean falling back to 'any' and loosing all type safety for such
 * properties. Transforming it into a single concrete optional type provides both type safety and
 * the option to omit the property. What it doesn't allow is explicitly passing 'null', which might
 * be desired in some cases. For now we prefer type safety over that.
 *
 * 1. ['null', '<type>'] -> optional '<type>'
 * 2. ['null', '<type1>', '<type2>'] -> optional 'any'
 *
 * This is the normal jsii conversion, nothing much we can do here.
 *
 * 3. ['<type1>', '<type2>'] -> 'any'
 */
function removeNullFromTypeArray(def: JSONSchema4): JSONSchema4 {
  if (!Array.isArray(def.type)) {
    return def;
  }

  const nullType = def.type.some(t => t === 'null');
  const nonNullTypes = new Set(def.type.filter(t => t !== 'null'));

  if (nullType) {
    def.required = false;
  }

  if (nonNullTypes.size === 0) {
    def.type = 'null';
  } else {
    // if its a union of non null types we use 'any' to be jsii compliant
    def.type = nonNullTypes.size > 1 ? 'any' : nonNullTypes.values().next().value;
  }

  return def;
}

/**
 * Schemas may define a type as a union of types with one of the types being `null`.
 * This is the same as defining an optional type.
 */
function removeNullFromUnion(def: JSONSchema4, combinator: 'anyOf' | 'oneOf'): JSONSchema4 {
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
export function reduceNullUnion(def: JSONSchema4): JSONSchema4 {
  const transformers: Array<(definition: JSONSchema4) => JSONSchema4> = [
    (d: JSONSchema4) => removeNullFromTypeArray(d),
    (d: JSONSchema4) => removeNullFromUnion(d, 'anyOf'),
    (d: JSONSchema4) => removeNullFromUnion(d, 'oneOf'),
  ];

  return transformers.reduce((input, transform) => transform(input), def);
}
