import { JSONSchema4, JSONSchema4Type } from 'json-schema';

const PRIMITIVE_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

/**
 * Custom property name for storing enum value descriptions.
 * Follows JSON Schema conventions for extension properties (x- prefix).
 */
export const ENUM_VALUE_DESCRIPTIONS_KEY = 'x-json2jsii-enumValueDescriptions';

/**
 * Type for the enum value descriptions mapping.
 */
export type EnumValueDescriptions = Record<string, string>;

/**
 * Reduces multiple occurrences of the same type in oneOf/anyOf into a single type.
 * Only reduces primitive types and $refs with matching references.
 * For enums, combines all enum values into a single enum and preserves descriptions.
 */
export function reduceDuplicateTypesInUnion(def: JSONSchema4): JSONSchema4 {
  // If there's no oneOf or anyOf, return as is
  if (!def.oneOf && !def.anyOf) {
    return def;
  }

  const union = def.oneOf || def.anyOf;
  if (!Array.isArray(union)) {
    return def;
  }

  const reducedUnion: JSONSchema4[] = [];
  const typeGroups = new Map<string, JSONSchema4[]>();

  // First pass: Group types by their type property or $ref
  for (const item of union) {
    // Handle $ref types
    if (item.$ref) {
      if (!typeGroups.has(item.$ref)) {
        typeGroups.set(item.$ref, []);
      }
      typeGroups.get(item.$ref)!.push(item);
      continue;
    }

    // Only group primitive types
    const type = item.type;
    if (!type || (typeof type === 'string' && !PRIMITIVE_TYPES.has(type))) {
      reducedUnion.push(item);
      continue;
    }

    const key = type.toString();
    if (!typeGroups.has(key)) {
      typeGroups.set(key, []);
    }
    typeGroups.get(key)!.push(item);
  }

  // For each group, if there are multiple items:
  // - For enums: combine all enum values
  // - For primitive types or matching $refs: keep only one instance
  for (const [_type, items] of typeGroups.entries()) {
    if (items.length === 1) {
      reducedUnion.push(items[0]);
      continue;
    }

    // If these are enums, combine their values
    if (items.every(item => Array.isArray(item.enum))) {
      const combinedEnum = new Set<JSONSchema4Type>();
      const enumValueDescriptions: EnumValueDescriptions = {};

      // Track which values came from single-value enums (higher priority)
      const singleValueDescriptions = new Map<string, string>();
      const multiValueDescriptions = new Map<string, string>();

      for (const item of items) {
        const isSingleValueEnum = item.enum!.length === 1;
        const description = typeof item.description === 'string' ? item.description : undefined;

        for (const value of item.enum!) {
          combinedEnum.add(value);

          // Only process if there's a description
          if (description) {
            const valueKey = String(value);

            if (isSingleValueEnum) {
              // Single-value enum: use first-wins within single-value enums
              if (!singleValueDescriptions.has(valueKey)) {
                singleValueDescriptions.set(valueKey, description);
              }
            } else {
              // Multi-value enum: use first-wins within multi-value enums
              if (!multiValueDescriptions.has(valueKey)) {
                multiValueDescriptions.set(valueKey, description);
              }
            }
          }
        }
      }

      // Build final descriptions: prefer single-value enum descriptions over multi-value
      for (const value of combinedEnum) {
        const valueKey = String(value);
        const singleDesc = singleValueDescriptions.get(valueKey);
        const multiDesc = multiValueDescriptions.get(valueKey);

        if (singleDesc) {
          enumValueDescriptions[valueKey] = singleDesc;
        } else if (multiDesc) {
          enumValueDescriptions[valueKey] = multiDesc;
        }
        // If neither has a description, don't add an entry (Requirement 1.4)
      }

      const combinedSchema: JSONSchema4 = {
        type: items[0].type, // Use the type from the first item
        enum: Array.from(combinedEnum),
      };

      // Only add descriptions property if there are any descriptions
      if (Object.keys(enumValueDescriptions).length > 0) {
        (combinedSchema as any)[ENUM_VALUE_DESCRIPTIONS_KEY] = enumValueDescriptions;
      }

      reducedUnion.push(combinedSchema);
    } else {
      // For primitive types or matching $refs, just keep the first one
      reducedUnion.push(items[0]);
    }
  }

  // Update the original definition
  if (def.oneOf) {
    def.oneOf = reducedUnion;
  } else {
    def.anyOf = reducedUnion;
  }

  return def;
}
