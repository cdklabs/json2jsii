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
export function reduceNullTypeArray(def: JSONSchema4): JSONSchema4 {
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
