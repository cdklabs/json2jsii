import { JSONSchema4 } from 'json-schema';
import { reduceDuplicateTypesInUnion } from '../src/transformers/union-duplicates';

describe('reduceDuplicateTypesInUnion', () => {
  test('should reduce duplicate primitive types', () => {
    const schema: JSONSchema4 = {
      oneOf: [
        { type: 'string' },
        { type: 'string' },
        { type: 'number' },
        { type: 'number' },
        { type: 'boolean' },
      ],
    };

    const result = reduceDuplicateTypesInUnion(schema);
    expect(result.oneOf).toHaveLength(3);
    expect(result.oneOf).toEqual([
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
    ]);
  });

  test('should not reduce non-primitive types', () => {
    const schema: JSONSchema4 = {
      oneOf: [
        { type: 'object', properties: { foo: { type: 'string' } } },
        { type: 'object', properties: { foo: { type: 'string' } } },
        { type: 'array', items: { type: 'string' } },
        { type: 'array', items: { type: 'string' } },
      ],
    };

    const result = reduceDuplicateTypesInUnion(schema);
    expect(result.oneOf).toHaveLength(4);
    expect(result.oneOf).toEqual([
      { type: 'object', properties: { foo: { type: 'string' } } },
      { type: 'object', properties: { foo: { type: 'string' } } },
      { type: 'array', items: { type: 'string' } },
      { type: 'array', items: { type: 'string' } },
    ]);
  });

  test('should reduce duplicate $refs', () => {
    const schema: JSONSchema4 = {
      oneOf: [
        { $ref: '#/definitions/MyType' },
        { $ref: '#/definitions/MyType' },
        { $ref: '#/definitions/OtherType' },
      ],
    };

    const result = reduceDuplicateTypesInUnion(schema);
    expect(result.oneOf).toHaveLength(2);
    expect(result.oneOf).toEqual([
      { $ref: '#/definitions/MyType' },
      { $ref: '#/definitions/OtherType' },
    ]);
  });

  test('should handle mixed primitive and non-primitive types', () => {
    const schema: JSONSchema4 = {
      oneOf: [
        { type: 'string' },
        { type: 'string' },
        { type: 'object', properties: { foo: { type: 'string' } } },
        { type: 'object', properties: { foo: { type: 'string' } } },
      ],
    };

    const result = reduceDuplicateTypesInUnion(schema);
    expect(result.oneOf).toHaveLength(3);
    expect(result.oneOf).toEqual([
      { type: 'object', properties: { foo: { type: 'string' } } },
      { type: 'object', properties: { foo: { type: 'string' } } },
      { type: 'string' },
    ]);
  });

  test('should handle enums correctly', () => {
    const schema: JSONSchema4 = {
      oneOf: [
        { type: 'string', enum: ['a', 'b'] },
        { type: 'string', enum: ['b', 'c'] },
        { type: 'number', enum: [1, 2] },
        { type: 'number', enum: [2, 3] },
      ],
    };

    const result = reduceDuplicateTypesInUnion(schema);
    expect(result.oneOf).toHaveLength(2);
    expect(result.oneOf).toEqual([
      { type: 'string', enum: ['a', 'b', 'c'] },
      { type: 'number', enum: [1, 2, 3] },
    ]);
  });
});
