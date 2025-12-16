import { JSONSchema4 } from 'json-schema';
import { TypeGenerator } from '../src';

describe('TypeGenerator.forStruct', () => {
  test('supports $defs references', () => {
    const schema: JSONSchema4 = {
      type: 'object',
      properties: {
        other: {
          $ref: '#/$defs/Other',
        },
      },
      $defs: {
        Other: {
          type: 'object',
          properties: {
            stringValue: { type: 'string' },
          },
          required: ['stringValue'],
        },
      },
    };

    const gen = TypeGenerator.forStruct('TestType', schema);
    expect(() => gen.render()).not.toThrow();
  });
});

