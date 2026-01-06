import { JSONSchema4 } from 'json-schema';
import { constToEnum } from '../src/transformers/const-to-enum';

describe('constToEnum', () => {
  describe('basic const conversion', () => {
    test('should convert string const to single-element enum array', () => {
      const schema: JSONSchema4 = {
        type: 'string',
        const: 'tab',
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual(['tab']);
      expect(result.const).toBeUndefined();
      expect(result.type).toBe('string');
    });

    test('should convert number const to single-element enum array', () => {
      const schema: JSONSchema4 = {
        type: 'number',
        const: 42,
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual([42]);
      expect(result.const).toBeUndefined();
      expect(result.type).toBe('number');
    });

    test('should convert boolean const to single-element enum array', () => {
      const schema: JSONSchema4 = {
        type: 'boolean',
        const: true,
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual([true]);
      expect(result.const).toBeUndefined();
    });

    test('should convert null const to single-element enum array', () => {
      const schema: JSONSchema4 = {
        const: null,
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual([null]);
      expect(result.const).toBeUndefined();
    });
  });

  describe('enum precedence over const', () => {
    test('should preserve existing enum and remove const when both present', () => {
      const schema: JSONSchema4 = {
        type: 'string',
        const: 'ignored',
        enum: ['a', 'b', 'c'],
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual(['a', 'b', 'c']);
      expect(result.const).toBeUndefined();
    });
  });


  describe('metadata preservation', () => {
    test('should preserve description when converting const', () => {
      const schema: JSONSchema4 = {
        type: 'string',
        const: 'tab',
        description: 'Tab indent style',
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual(['tab']);
      expect(result.description).toBe('Tab indent style');
      expect(result.type).toBe('string');
    });

    test('should preserve all other properties when converting const', () => {
      const schema: JSONSchema4 = {
        type: 'string',
        const: 'value',
        title: 'My Title',
        description: 'My Description',
        default: 'value',
      };

      const result = constToEnum(schema);

      expect(result.enum).toEqual(['value']);
      expect(result.title).toBe('My Title');
      expect(result.description).toBe('My Description');
      expect(result.default).toBe('value');
      expect(result.const).toBeUndefined();
    });
  });

  describe('nested schema transformation', () => {
    test('should transform const in nested properties', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          indent: {
            type: 'string',
            const: 'tab',
          },
          size: {
            type: 'number',
            const: 4,
          },
        },
      };

      const result = constToEnum(schema);

      expect(result.properties?.indent.enum).toEqual(['tab']);
      expect(result.properties?.indent.const).toBeUndefined();
      expect(result.properties?.size.enum).toEqual([4]);
      expect(result.properties?.size.const).toBeUndefined();
    });

    test('should transform const in deeply nested properties', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              style: {
                type: 'string',
                const: 'compact',
              },
            },
          },
        },
      };

      const result = constToEnum(schema);

      expect(result.properties?.config.properties?.style.enum).toEqual(['compact']);
      expect(result.properties?.config.properties?.style.const).toBeUndefined();
    });
  });


  describe('oneOf/anyOf with const values', () => {
    test('should transform const values in oneOf members', () => {
      const schema: JSONSchema4 = {
        oneOf: [
          { type: 'string', const: 'tab' },
          { type: 'string', const: 'space' },
        ],
      };

      const result = constToEnum(schema);

      expect(result.oneOf?.[0].enum).toEqual(['tab']);
      expect(result.oneOf?.[0].const).toBeUndefined();
      expect(result.oneOf?.[1].enum).toEqual(['space']);
      expect(result.oneOf?.[1].const).toBeUndefined();
    });

    test('should transform const values in anyOf members', () => {
      const schema: JSONSchema4 = {
        anyOf: [
          { type: 'number', const: 2 },
          { type: 'number', const: 4 },
        ],
      };

      const result = constToEnum(schema);

      expect(result.anyOf?.[0].enum).toEqual([2]);
      expect(result.anyOf?.[0].const).toBeUndefined();
      expect(result.anyOf?.[1].enum).toEqual([4]);
      expect(result.anyOf?.[1].const).toBeUndefined();
    });

    test('should transform const values in allOf members', () => {
      const schema: JSONSchema4 = {
        allOf: [
          { type: 'string', const: 'fixed' },
        ],
      };

      const result = constToEnum(schema);

      expect(result.allOf?.[0].enum).toEqual(['fixed']);
      expect(result.allOf?.[0].const).toBeUndefined();
    });

    test('should transform const in nested oneOf within properties', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          indentStyle: {
            oneOf: [
              { type: 'string', const: 'tab', description: 'Use tabs' },
              { type: 'string', const: 'space', description: 'Use spaces' },
            ],
          },
        },
      };

      const result = constToEnum(schema);

      expect(result.properties?.indentStyle.oneOf?.[0].enum).toEqual(['tab']);
      expect(result.properties?.indentStyle.oneOf?.[0].description).toBe('Use tabs');
      expect(result.properties?.indentStyle.oneOf?.[1].enum).toEqual(['space']);
      expect(result.properties?.indentStyle.oneOf?.[1].description).toBe('Use spaces');
    });
  });


  describe('edge cases', () => {
    test('should not transform object const (not a valid enum value)', () => {
      const schema: JSONSchema4 = {
        const: { key: 'value' },
      };

      const result = constToEnum(schema);

      expect(result.const).toEqual({ key: 'value' });
      expect(result.enum).toBeUndefined();
    });

    test('should not transform array const (not a valid enum value)', () => {
      const schema: JSONSchema4 = {
        const: ['a', 'b'],
      };

      const result = constToEnum(schema);

      expect(result.const).toEqual(['a', 'b']);
      expect(result.enum).toBeUndefined();
    });

    test('should handle schema without const property', () => {
      const schema: JSONSchema4 = {
        type: 'string',
        description: 'A simple string',
      };

      const result = constToEnum(schema);

      expect(result.type).toBe('string');
      expect(result.description).toBe('A simple string');
      expect(result.enum).toBeUndefined();
      expect(result.const).toBeUndefined();
    });

    test('should handle empty schema', () => {
      const schema: JSONSchema4 = {};

      const result = constToEnum(schema);

      expect(result).toEqual({});
    });

    test('should transform const in array items', () => {
      const schema: JSONSchema4 = {
        type: 'array',
        items: {
          type: 'string',
          const: 'fixed',
        },
      };

      const result = constToEnum(schema);

      expect((result.items as JSONSchema4).enum).toEqual(['fixed']);
      expect((result.items as JSONSchema4).const).toBeUndefined();
    });

    test('should transform const in additionalProperties', () => {
      const schema: JSONSchema4 = {
        type: 'object',
        additionalProperties: {
          type: 'string',
          const: 'value',
        },
      };

      const result = constToEnum(schema);

      expect((result.additionalProperties as JSONSchema4).enum).toEqual(['value']);
      expect((result.additionalProperties as JSONSchema4).const).toBeUndefined();
    });

    test('should handle mixed const and enum in oneOf', () => {
      const schema: JSONSchema4 = {
        oneOf: [
          { type: 'string', const: 'a' },
          { type: 'string', enum: ['b', 'c'] },
        ],
      };

      const result = constToEnum(schema);

      expect(result.oneOf?.[0].enum).toEqual(['a']);
      expect(result.oneOf?.[0].const).toBeUndefined();
      expect(result.oneOf?.[1].enum).toEqual(['b', 'c']);
    });

    test('should handle required property with boolean true schema', () => {
      const schema: JSONSchema4 = {
        required: ['field'],
        properties: {
          field: true as any,
        },
      };

      const result = constToEnum(schema);

      expect(result.required).toEqual(['field']);
      expect(result.properties?.field).toBe(true);
    });
  });
});
