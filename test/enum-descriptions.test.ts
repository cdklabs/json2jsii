import { JSONSchema4 } from 'json-schema';
import { TypeGenerator } from '../src';
import { generate } from './util';

/**
 * End-to-end tests for the preserve-enum-descriptions feature.
 * These tests verify the full flow from combining enums with descriptions
 * in oneOf/anyOf to generating TypeScript code with JSDoc comments.
 *
 * Uses hoistSingletonUnions transformation to convert the combined enum
 * from a oneOf into a direct enum type.
 */
describe('enum value descriptions', () => {

  test('preserves descriptions when combining enums in oneOf', async () => {
    // End-to-end test: combining enums with descriptions should produce JSDoc comments
    const schema: JSONSchema4 = {
      properties: {
        status: {
          oneOf: [
            {
              type: 'string',
              enum: ['active'],
              description: 'The resource is currently active and running',
            },
            {
              type: 'string',
              enum: ['inactive'],
              description: 'The resource is not currently running',
            },
            {
              type: 'string',
              enum: ['pending', 'unknown'],
              description: 'Multi-value enum description',
            },
          ],
        },
      },
    };

    const gen = TypeGenerator.forStruct('Foo', schema, {
      toJson: false,
      transformations: {
        hoistSingletonUnions: true,
      },
    });

    expect(await generate(gen)).toMatchSnapshot();
  });

  test('single-value enum descriptions take precedence over multi-value', async () => {
    // When the same value appears in both single-value and multi-value enums,
    // the single-value enum description should win
    const schema: JSONSchema4 = {
      properties: {
        priority: {
          oneOf: [
            {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'General priority levels',
            },
            {
              type: 'string',
              enum: ['high'],
              description: 'Highest priority - process immediately',
            },
          ],
        },
      },
    };

    const gen = TypeGenerator.forStruct('Foo', schema, {
      toJson: false,
      transformations: {
        hoistSingletonUnions: true,
      },
    });

    expect(await generate(gen)).toMatchSnapshot();
  });

  test('escapes special characters in descriptions', async () => {
    const schema: JSONSchema4 = {
      properties: {
        format: {
          oneOf: [
            {
              type: 'string',
              enum: ['json'],
              description: 'JSON format /* with special */ characters',
            },
            {
              type: 'string',
              enum: ['xml'],
              description: 'XML format',
            },
          ],
        },
      },
    };

    const gen = TypeGenerator.forStruct('Foo', schema, {
      toJson: false,
      transformations: {
        hoistSingletonUnions: true,
      },
    });

    expect(await generate(gen)).toMatchSnapshot();
  });

  test('handles mixed described and undescribed enums', async () => {
    const schema: JSONSchema4 = {
      properties: {
        mode: {
          oneOf: [
            {
              type: 'string',
              enum: ['auto'],
              description: 'Automatic mode selection',
            },
            {
              type: 'string',
              enum: ['manual'],
              // No description
            },
            {
              type: 'string',
              enum: ['hybrid'],
              description: 'Combination of auto and manual',
            },
          ],
        },
      },
    };

    const gen = TypeGenerator.forStruct('Foo', schema, {
      toJson: false,
      transformations: {
        hoistSingletonUnions: true,
      },
    });

    expect(await generate(gen)).toMatchSnapshot();
  });

  test('works with anyOf as well as oneOf', async () => {
    const schema: JSONSchema4 = {
      properties: {
        level: {
          anyOf: [
            {
              type: 'string',
              enum: ['debug'],
              description: 'Debug level logging',
            },
            {
              type: 'string',
              enum: ['info'],
              description: 'Info level logging',
            },
            {
              type: 'string',
              enum: ['error'],
              description: 'Error level logging',
            },
          ],
        },
      },
    };

    const gen = TypeGenerator.forStruct('Foo', schema, {
      toJson: false,
      transformations: {
        hoistSingletonUnions: true,
      },
    });

    expect(await generate(gen)).toMatchSnapshot();
  });

});
