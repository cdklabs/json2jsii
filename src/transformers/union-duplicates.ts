import { JSONSchema4, JSONSchema4Type } from 'json-schema';

const PRIMITIVE_TYPES = new Set(['string', 'number', 'integer', 'boolean']);

/**
 * Reduces multiple occurrences of the same type in oneOf/anyOf into a single type.
 * Only reduces primitive types and $refs with matching references.
 * For enums, combines all enum values into a single enum.
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
      for (const item of items) {
        for (const value of item.enum!) {
          combinedEnum.add(value);
        }
      }
      reducedUnion.push({
        type: items[0].type, // Use the type from the first item
        enum: Array.from(combinedEnum),
      });
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
