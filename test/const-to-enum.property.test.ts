import * as fc from 'fast-check';
import { JSONSchema4 } from 'json-schema';
import { constToEnum } from '../src/transformers/const-to-enum';

/**
 * Feature: const-to-enum-transform, Property 5: End-to-end enum generation
 * Validates: Requirements 4.1, 4.2, 4.3
 *
 * Property tests for the constToEnum transformer function.
 * These tests verify that the transformer correctly converts const to enum
 * across many randomly generated inputs.
 */
describe('const-to-enum property tests', () => {
  // Arbitrary for primitive const values (string, number, boolean)
  const primitiveConstArb = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true }),
    fc.boolean(),
  );

  // Arbitrary for string const values
  const stringConstArb = fc.string();

  // Arbitrary for number const values
  const numberConstArb = fc.oneof(fc.integer(), fc.double({ noNaN: true }));

  describe('Property 5: Transformer correctness', () => {
    /**
     * Property 5a: Const-to-enum conversion
     * For any schema with a primitive const value, the transformer SHALL
     * produce a schema with an enum array containing that value.
     * Validates: Requirements 1.1, 1.2, 1.4
     */
    test('primitive const values are converted to single-element enum arrays', () => {
      fc.assert(
        fc.property(primitiveConstArb, (constValue) => {
          const schema: JSONSchema4 = { const: constValue };
          const result = constToEnum(schema);

          // Should have enum with the const value
          expect(result.enum).toEqual([constValue]);
          // Should not have const anymore
          expect(result.const).toBeUndefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5b: Enum precedence over const
     * For any schema with both const and enum, the transformer SHALL
     * preserve the enum and remove the const.
     * Validates: Requirements 1.3
     */
    test('enum takes precedence over const when both present', () => {
      fc.assert(
        fc.property(
          primitiveConstArb,
          fc.array(primitiveConstArb, { minLength: 1, maxLength: 5 }),
          (constValue, enumValues) => {
            const schema: JSONSchema4 = {
              const: constValue,
              enum: enumValues,
            };
            const result = constToEnum(schema);

            // Should preserve original enum
            expect(result.enum).toEqual(enumValues);
            // Should not have const anymore
            expect(result.const).toBeUndefined();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5c: Metadata preservation
     * For any schema with const and other properties, the transformer SHALL
     * preserve all non-const properties.
     * Validates: Requirements 2.1, 2.2, 2.3
     */
    test('metadata is preserved during transformation', () => {
      fc.assert(
        fc.property(
          stringConstArb,
          fc.string(),
          fc.string(),
          (constValue, description, title) => {
            const schema: JSONSchema4 = {
              type: 'string',
              const: constValue,
              description,
              title,
            };
            const result = constToEnum(schema);

            // Should preserve metadata
            expect(result.type).toBe('string');
            expect(result.description).toBe(description);
            expect(result.title).toBe(title);
            // Should have converted const to enum
            expect(result.enum).toEqual([constValue]);
            expect(result.const).toBeUndefined();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5d: Recursive transformation in oneOf
     * For any schema with oneOf containing const values, the transformer SHALL
     * convert all const values to enum arrays.
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    test('const values in oneOf are recursively transformed', () => {
      fc.assert(
        fc.property(
          fc.array(stringConstArb, { minLength: 2, maxLength: 5 }),
          (constValues) => {
            const schema: JSONSchema4 = {
              oneOf: constValues.map(v => ({ type: 'string' as const, const: v })),
            };
            const result = constToEnum(schema);

            // Each oneOf member should have enum instead of const
            result.oneOf?.forEach((member, i) => {
              expect(member.enum).toEqual([constValues[i]]);
              expect(member.const).toBeUndefined();
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5e: Recursive transformation in nested properties
     * For any schema with nested properties containing const values,
     * the transformer SHALL convert all const values to enum arrays.
     * Validates: Requirements 3.1, 3.2, 3.3
     */
    test('const values in nested properties are recursively transformed', () => {
      fc.assert(
        fc.property(
          stringConstArb,
          numberConstArb,
          (stringConst, numberConst) => {
            const schema: JSONSchema4 = {
              type: 'object',
              properties: {
                stringProp: { type: 'string', const: stringConst },
                numberProp: { type: 'number', const: numberConst },
              },
            };
            const result = constToEnum(schema);

            // Nested properties should have enum instead of const
            expect(result.properties?.stringProp.enum).toEqual([stringConst]);
            expect(result.properties?.stringProp.const).toBeUndefined();
            expect(result.properties?.numberProp.enum).toEqual([numberConst]);
            expect(result.properties?.numberProp.const).toBeUndefined();

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5f: Object and array const values are not converted
     * For any schema with object or array const values, the transformer SHALL
     * NOT convert them to enum (they are not valid TypeScript enum values).
     * Validates: Edge case handling
     */
    test('object and array const values are not converted to enum', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.object(),
            fc.array(fc.anything()),
          ),
          (complexValue) => {
            const schema: JSONSchema4 = { const: complexValue };
            const result = constToEnum(schema);

            // Should NOT have enum (complex values can't be enum)
            expect(result.enum).toBeUndefined();
            // Should still have const
            expect(result.const).toEqual(complexValue);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
