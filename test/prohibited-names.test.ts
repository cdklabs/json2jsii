import * as fc from 'fast-check';
import { JSONSchema4 } from 'json-schema';
import { TypeGenerator } from '../src';

describe('prohibited member names', () => {
  describe('unit tests', () => {
    test("'build' property becomes 'build_'", () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          build: { type: 'string' },
        },
      };

      const gen = TypeGenerator.forStruct('TestStruct', schema);
      const output = gen.render();

      expect(output).toContain('readonly build_?:');
      expect(output).not.toMatch(/readonly build\?:/);
    });

    test("'equals' property becomes 'equals_'", () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          equals: { type: 'boolean' },
        },
      };

      const gen = TypeGenerator.forStruct('TestStruct', schema);
      const output = gen.render();

      expect(output).toContain('readonly equals_?:');
      expect(output).not.toMatch(/readonly equals\?:/);
    });

    test("'hashcode' property becomes 'hashcode_'", () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          hashcode: { type: 'number' },
        },
      };

      const gen = TypeGenerator.forStruct('TestStruct', schema);
      const output = gen.render();

      expect(output).toContain('readonly hashcode_?:');
      expect(output).not.toMatch(/readonly hashcode\?:/);
    });

    test('non-prohibited names remain unchanged', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: 'number' },
          enabled: { type: 'boolean' },
        },
      };

      const gen = TypeGenerator.forStruct('TestStruct', schema);
      const output = gen.render();

      expect(output).toContain('readonly name?:');
      expect(output).toContain('readonly value?:');
      expect(output).toContain('readonly enabled?:');
    });

    test('toJson correctly maps renamed properties to original names', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          build: { type: 'string' },
          name: { type: 'string' },
        },
      };

      const gen = TypeGenerator.forStruct('TestStruct', schema);
      const output = gen.render();

      // The toJson function should map build_ back to 'build'
      expect(output).toContain("'build': obj.build_");
      expect(output).toContain("'name': obj.name");
    });

    test('prohibited names are case-insensitive', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          BUILD: { type: 'string' },
          Equals: { type: 'boolean' },
          HashCode: { type: 'number' },
        },
      };

      const gen = TypeGenerator.forStruct('TestStruct', schema);
      const output = gen.render();

      // After camelCase conversion, these become 'build', 'equals', 'hashCode'
      // which should be renamed to 'build_', 'equals_', 'hashCode_'
      expect(output).toContain('readonly build_?:');
      expect(output).toContain('readonly equals_?:');
      expect(output).toContain('readonly hashCode_?:');
    });
  });
});


/**
 * Property-based tests for prohibited name handling
 * Feature: reserved-word-property-names
 */
describe('prohibited member names - property tests', () => {
  const PROHIBITED_NAMES = ['build', 'equals', 'hashcode'];

  /**
   * Property 1: Prohibited names get underscore suffix
   * Validates: Requirements 1.1
   *
   * For any property name that, after camelCase conversion, matches a prohibited
   * member name (case-insensitive), the emitted TypeScript property name SHALL
   * have an underscore suffix appended.
   */
  test('Property 1: Prohibited names get underscore suffix', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PROHIBITED_NAMES),
        (prohibitedName) => {
          const schema: JSONSchema4 = {
            type: 'object',
            properties: {
              [prohibitedName]: { type: 'string' },
            },
          };

          const gen = TypeGenerator.forStruct('TestStruct', schema);
          const output = gen.render();

          // The property should be renamed with underscore suffix
          expect(output).toContain(`readonly ${prohibitedName}_?:`);
          // The original name should not appear as a property
          expect(output).not.toMatch(new RegExp(`readonly ${prohibitedName}\\?:`));
        },
      ),
      { numRuns: 100 },
    );
  });
});


describe('prohibited member names - property tests (continued)', () => {
  const PROHIBITED_NAMES = ['build', 'equals', 'hashcode'];

  /**
   * Property 2: Non-prohibited names remain unchanged
   * Validates: Requirements 1.2
   *
   * For any property name that, after camelCase conversion, does NOT match any
   * prohibited member name, the emitted TypeScript property name SHALL equal
   * the camelCase-converted name.
   */
  test('Property 2: Non-prohibited names remain unchanged', () => {
    // Generate simple lowercase alphabetic property names that are not prohibited
    // Using lowercase-only alphabetic names avoids camelCase conversion complexity
    const validPropertyNameArb = fc.string({ minLength: 1, maxLength: 15 })
      .filter(s => /^[a-z]+$/.test(s))
      .filter(s => !PROHIBITED_NAMES.includes(s));

    fc.assert(
      fc.property(
        validPropertyNameArb,
        (propertyName) => {
          const schema: JSONSchema4 = {
            type: 'object',
            properties: {
              [propertyName]: { type: 'string' },
            },
          };

          const gen = TypeGenerator.forStruct('TestStruct', schema);
          const output = gen.render();

          // For lowercase-only alphabetic names, camelCase conversion is identity
          // The property should NOT have underscore suffix
          expect(output).not.toContain(`readonly ${propertyName}_?:`);
          // The property should appear with its original name
          expect(output).toContain(`readonly ${propertyName}?:`);
        },
      ),
      { numRuns: 100 },
    );
  });
});
