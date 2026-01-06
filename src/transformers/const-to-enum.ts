import { JSONSchema4 } from 'json-schema';

/**
 * Transforms JSON Schema `const` keywords into equivalent single-value `enum` arrays.
 * This normalization allows the existing enum handling logic to process both patterns uniformly.
 *
 * @example
 * Input:  { type: 'string', const: 'tab', description: 'Tab indent' }
 * Output: { type: 'string', enum: ['tab'], description: 'Tab indent' }
 *
 * @param def - The JSON schema definition to transform
 * @returns The transformed schema with `const` converted to `enum`
 */
export function constToEnum(def: JSONSchema4): JSONSchema4 {
  return transformConstToEnum(def);
}

/**
 * Recursively transforms all `const` properties to `enum` arrays throughout the schema.
 */
function transformConstToEnum(def: JSONSchema4): JSONSchema4 {
  // Handle the current level's const property
  if (hasConst(def)) {
    // If enum already exists, preserve it and remove const (enum takes precedence)
    if (def.enum !== undefined) {
      delete def.const;
    } else {
      // Only convert primitive values (string, number, boolean, null) to enum
      // Objects and arrays are not valid enum values in TypeScript
      const constValue = def.const;
      if (isPrimitiveValue(constValue)) {
        def.enum = [constValue];
        delete def.const;
      }
    }
  }

  // Recursively transform nested schemas in properties
  if (def.properties && typeof def.properties === 'object') {
    for (const key of Object.keys(def.properties)) {
      def.properties[key] = transformConstToEnum(def.properties[key]);
    }
  }

  // Recursively transform oneOf members
  if (Array.isArray(def.oneOf)) {
    def.oneOf = def.oneOf.map(item => transformConstToEnum(item));
  }

  // Recursively transform anyOf members
  if (Array.isArray(def.anyOf)) {
    def.anyOf = def.anyOf.map(item => transformConstToEnum(item));
  }

  // Recursively transform allOf members
  if (Array.isArray(def.allOf)) {
    def.allOf = def.allOf.map(item => transformConstToEnum(item));
  }

  // Recursively transform items (for array schemas)
  if (def.items && typeof def.items === 'object' && !Array.isArray(def.items)) {
    def.items = transformConstToEnum(def.items);
  }

  // Recursively transform additionalProperties
  if (def.additionalProperties && typeof def.additionalProperties === 'object') {
    def.additionalProperties = transformConstToEnum(def.additionalProperties);
  }

  return def;
}

/**
 * Type guard to check if the schema has a `const` property defined.
 */
function hasConst(def: JSONSchema4): boolean {
  return typeof def === 'object' && 'const' in def && def.const !== undefined;
}

/**
 * Checks if a value is a primitive type that can be represented as a TypeScript enum value.
 * Objects and arrays cannot be enum values.
 */
function isPrimitiveValue(value: unknown): value is string | number | boolean | null {
  if (value === null) {
    return true;
  }
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean';
}
