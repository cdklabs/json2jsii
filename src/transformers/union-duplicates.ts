import { JSONSchema4, JSONSchema4Type, JSONSchema4TypeName } from 'json-schema';

/**
 * Reduces multiple occurrences of the same type in oneOf/anyOf into a single type.
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

  // Group types by their type property
  const typeGroups = new Map<JSONSchema4TypeName | JSONSchema4TypeName[], JSONSchema4[]>();
  for (const item of union) {
    const key = item.type || 'any';
    if (!typeGroups.has(key)) {
      typeGroups.set(key, []);
    }
    typeGroups.get(key)!.push(item);
  }

  // For each group, if there are multiple items:
  // - For enums: combine all enum values
  // - For other types: keep only one instance
  const reducedUnion: JSONSchema4[] = [];
  for (const [type, items] of typeGroups.entries()) {
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
        type,
        enum: Array.from(combinedEnum),
      });
    } else {
      // For non-enums, just keep the first one
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
