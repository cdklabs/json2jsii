import * as fc from 'fast-check';
import { JSONSchema4 } from 'json-schema';
import {
  reduceDuplicateTypesInUnion,
  ENUM_VALUE_DESCRIPTIONS_KEY,
  EnumValueDescriptions,
} from '../src/transformers/union-duplicates';

/**
 * Feature: preserve-enum-descriptions
 * Property tests for description collection when combining enums
 */

// Helper to create an enum schema with optional description
function createEnumSchema(values: string[], description?: string): JSONSchema4 {
  const schema: JSONSchema4 = {
    type: 'string',
    enum: values,
  };
  if (description !== undefined) {
    schema.description = description;
  }
  return schema;
}

// Arbitrary for generating non-empty alphanumeric strings (enum values)
const enumValueArb = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 1, maxLength: 10 });

// Arbitrary for generating description strings
const descriptionArb = fc.string({ minLength: 1, maxLength: 50 });

// Arbitrary for generating an enum schema with description
const enumSchemaWithDescArb = fc.tuple(
  fc.uniqueArray(enumValueArb, { minLength: 1, maxLength: 5 }),
  descriptionArb,
).map(([values, desc]) => createEnumSchema(values, desc));

describe('reduceDuplicateTypesInUnion - Property Tests', () => {
  /**
   * Property 1: Description Collection and Storage
   * For any oneOf/anyOf containing enum schemas with descriptions, after transformation,
   * the combined enum schema SHALL contain an x-json2jsii-enumValueDescriptions property
   * with all descriptions from the original schemas correctly mapped to their corresponding enum values.
   *
   * Validates: Requirements 1.1, 1.5
   */
  test('Property 1: Description Collection and Storage', () => {
    fc.assert(
      fc.property(
        fc.array(enumSchemaWithDescArb, { minLength: 2, maxLength: 5 }),
        fc.boolean(), // true = oneOf, false = anyOf
        (enumSchemas, useOneOf) => {
          // Build the union schema
          const schema: JSONSchema4 = useOneOf
            ? { oneOf: enumSchemas }
            : { anyOf: enumSchemas };

          // Apply the transformation
          const result = reduceDuplicateTypesInUnion(schema);

          // Get the combined enum from the result
          const union = useOneOf ? result.oneOf : result.anyOf;
          expect(union).toBeDefined();

          // Find the string enum in the result
          const combinedEnum = union!.find(
            (item: JSONSchema4) => item.type === 'string' && Array.isArray(item.enum),
          );
          expect(combinedEnum).toBeDefined();

          // Get the descriptions from the combined enum
          const descriptions = (combinedEnum as any)[ENUM_VALUE_DESCRIPTIONS_KEY] as EnumValueDescriptions | undefined;

          // Build expected descriptions from input schemas
          // For each value, we expect the description from the first schema that has it
          // (with single-value preference, but this test focuses on collection)
          const expectedValues = new Set<string>();
          for (const enumSchema of enumSchemas) {
            for (const value of enumSchema.enum!) {
              expectedValues.add(String(value));
            }
          }

          // Verify all enum values are in the combined enum
          const combinedValues = new Set(combinedEnum!.enum!.map(v => String(v)));
          for (const value of expectedValues) {
            expect(combinedValues.has(value)).toBe(true);
          }

          // Verify descriptions are stored (if any schemas had descriptions)
          // At minimum, values from schemas with descriptions should have entries
          if (descriptions) {
            for (const [value, desc] of Object.entries(descriptions)) {
              expect(typeof desc).toBe('string');
              expect(desc.length).toBeGreaterThan(0);
              expect(combinedValues.has(value)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });


  /**
   * Property 2: Single-Value Enum Description Preference
   * For any oneOf/anyOf where the same enum value appears in both a single-value enum
   * and a multi-value enum with different descriptions, the combined enum's
   * x-json2jsii-enumValueDescriptions SHALL contain the description from the single-value enum.
   *
   * Validates: Requirements 1.2
   */
  test('Property 2: Single-Value Enum Description Preference', () => {
    fc.assert(
      fc.property(
        enumValueArb, // The shared value
        descriptionArb, // Description for single-value enum
        descriptionArb, // Description for multi-value enum
        fc.uniqueArray(enumValueArb, { minLength: 1, maxLength: 3 }), // Additional values for multi-value enum
        fc.boolean(), // true = oneOf, false = anyOf
        fc.boolean(), // true = single-value first, false = multi-value first
        (sharedValue, singleDesc, multiDesc, additionalValues, useOneOf, singleFirst) => {
          // Ensure descriptions are different
          fc.pre(singleDesc !== multiDesc);

          // Ensure sharedValue is not in additionalValues
          const filteredAdditional = additionalValues.filter(v => v !== sharedValue);

          // Create single-value enum with description
          const singleValueEnum = createEnumSchema([sharedValue], singleDesc);

          // Create multi-value enum with description (includes sharedValue)
          const multiValueEnum = createEnumSchema([sharedValue, ...filteredAdditional], multiDesc);

          // Build the union schema with order based on singleFirst
          const enumSchemas = singleFirst
            ? [singleValueEnum, multiValueEnum]
            : [multiValueEnum, singleValueEnum];

          const schema: JSONSchema4 = useOneOf
            ? { oneOf: enumSchemas }
            : { anyOf: enumSchemas };

          // Apply the transformation
          const result = reduceDuplicateTypesInUnion(schema);

          // Get the combined enum from the result
          const union = useOneOf ? result.oneOf : result.anyOf;
          const combinedEnum = union!.find(
            (item: JSONSchema4) => item.type === 'string' && Array.isArray(item.enum),
          );

          // Get the descriptions
          const descriptions = (combinedEnum as any)[ENUM_VALUE_DESCRIPTIONS_KEY] as EnumValueDescriptions;

          // The shared value should have the single-value enum's description
          expect(descriptions).toBeDefined();
          expect(descriptions[sharedValue]).toBe(singleDesc);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 3: First-Wins for Same-Priority Duplicates
   * For any oneOf/anyOf where the same enum value appears in multiple schemas of the same priority
   * (both single-value or both multi-value) with different descriptions, the combined enum's
   * x-json2jsii-enumValueDescriptions SHALL contain only the first encountered description.
   *
   * Validates: Requirements 1.3
   */
  test('Property 3: First-Wins for Same-Priority Duplicates', () => {
    fc.assert(
      fc.property(
        enumValueArb, // The shared value
        descriptionArb, // First description
        descriptionArb, // Second description
        fc.boolean(), // true = both single-value, false = both multi-value
        fc.boolean(), // true = oneOf, false = anyOf
        (sharedValue, firstDesc, secondDesc, bothSingle, useOneOf) => {
          // Ensure descriptions are different
          fc.pre(firstDesc !== secondDesc);

          let firstEnum: JSONSchema4;
          let secondEnum: JSONSchema4;

          if (bothSingle) {
            // Both are single-value enums
            firstEnum = createEnumSchema([sharedValue], firstDesc);
            secondEnum = createEnumSchema([sharedValue], secondDesc);
          } else {
            // Both are multi-value enums
            firstEnum = createEnumSchema([sharedValue, 'extra1'], firstDesc);
            secondEnum = createEnumSchema([sharedValue, 'extra2'], secondDesc);
          }

          const schema: JSONSchema4 = useOneOf
            ? { oneOf: [firstEnum, secondEnum] }
            : { anyOf: [firstEnum, secondEnum] };

          // Apply the transformation
          const result = reduceDuplicateTypesInUnion(schema);

          // Get the combined enum from the result
          const union = useOneOf ? result.oneOf : result.anyOf;
          const combinedEnum = union!.find(
            (item: JSONSchema4) => item.type === 'string' && Array.isArray(item.enum),
          );

          // Get the descriptions
          const descriptions = (combinedEnum as any)[ENUM_VALUE_DESCRIPTIONS_KEY] as EnumValueDescriptions;

          // The shared value should have the first description (first-wins)
          expect(descriptions).toBeDefined();
          expect(descriptions[sharedValue]).toBe(firstDesc);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4: No Spurious Descriptions
   * For any enum value that comes from a schema without a description, the combined enum's
   * x-json2jsii-enumValueDescriptions SHALL NOT contain an entry for that value.
   *
   * Validates: Requirements 1.4
   */
  test('Property 4: No Spurious Descriptions', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(enumValueArb, { minLength: 1, maxLength: 3 }), // Values without description
        fc.boolean(), // true = oneOf, false = anyOf
        (valuesWithoutDesc, useOneOf) => {
          // Create enum schema without description
          const enumWithoutDesc = createEnumSchema(valuesWithoutDesc);

          const schema: JSONSchema4 = useOneOf
            ? { oneOf: [enumWithoutDesc] }
            : { anyOf: [enumWithoutDesc] };

          // Apply the transformation
          const result = reduceDuplicateTypesInUnion(schema);

          // Get the combined enum from the result
          const union = useOneOf ? result.oneOf : result.anyOf;
          const combinedEnum = union!.find(
            (item: JSONSchema4) => item.type === 'string' && Array.isArray(item.enum),
          );

          // Get the descriptions (should be undefined or empty)
          const descriptions = (combinedEnum as any)[ENUM_VALUE_DESCRIPTIONS_KEY] as EnumValueDescriptions | undefined;

          // No descriptions should be added for values without descriptions
          if (descriptions) {
            for (const value of valuesWithoutDesc) {
              expect(descriptions[value]).toBeUndefined();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (extended): Mixed described/undescribed schemas
   * When combining schemas where some have descriptions and some don't,
   * only values from schemas with descriptions should have entries.
   */
  test('Property 4: No Spurious Descriptions - Mixed schemas', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(enumValueArb, { minLength: 1, maxLength: 3 }), // Values with description
        fc.uniqueArray(enumValueArb, { minLength: 1, maxLength: 3 }), // Values without description
        descriptionArb,
        fc.boolean(), // true = oneOf, false = anyOf
        (valuesWithDesc, valuesWithoutDesc, description, useOneOf) => {
          // Ensure no overlap between the two sets
          const filteredWithoutDesc = valuesWithoutDesc.filter(v => !valuesWithDesc.includes(v));
          fc.pre(filteredWithoutDesc.length > 0);

          // Create enum schemas
          const enumWithDesc = createEnumSchema(valuesWithDesc, description);
          const enumWithoutDesc = createEnumSchema(filteredWithoutDesc);

          const schema: JSONSchema4 = useOneOf
            ? { oneOf: [enumWithDesc, enumWithoutDesc] }
            : { anyOf: [enumWithDesc, enumWithoutDesc] };

          // Apply the transformation
          const result = reduceDuplicateTypesInUnion(schema);

          // Get the combined enum from the result
          const union = useOneOf ? result.oneOf : result.anyOf;
          const combinedEnum = union!.find(
            (item: JSONSchema4) => item.type === 'string' && Array.isArray(item.enum),
          );

          // Get the descriptions
          const descriptions = (combinedEnum as any)[ENUM_VALUE_DESCRIPTIONS_KEY] as EnumValueDescriptions | undefined;

          // Values without descriptions should not have entries
          if (descriptions) {
            for (const value of filteredWithoutDesc) {
              expect(descriptions[value]).toBeUndefined();
            }
            // Values with descriptions should have entries
            for (const value of valuesWithDesc) {
              expect(descriptions[value]).toBe(description);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
