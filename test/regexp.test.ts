import { TypeGenerator } from '../src';

test('timeout regexp example', () => {
  const g = TypeGenerator.forStruct(
    'Timeout',
    {
      $ref: '#/definitions/config',
      definitions: {
        config: {
          properties: {
            timeout: {
              oneOf: [
                {
                  type: 'string',
                  pattern: '^[0-9]+(ns|us|µs|μs|ms|s|m|h)?$',
                },
                {
                  type: 'number',
                },
              ],
            },
          },
        },
      },
    },
    { emitRegexValidation: true },
  );

  expect(g.render()).toMatchSnapshot();
});

test('escapes backslashes and quotes in patterns', () => {
  const g = TypeGenerator.forStruct(
    'Test',
    {
      $ref: '#/definitions/config',
      definitions: {
        config: {
          properties: {
            path: {
              oneOf: [
                {
                  type: 'string',
                  pattern: "^[\\w']+$",
                },
              ],
            },
          },
        },
      },
    },
    { emitRegexValidation: true },
  );

  const output = g.render();
  expect(output).toContain("new RegExp('^[\\\\w\\']+$')");
});

test('no validation emitted when emitRegexValidation is false', () => {
  const g = TypeGenerator.forStruct(
    'Test',
    {
      $ref: '#/definitions/config',
      definitions: {
        config: {
          properties: {
            value: {
              oneOf: [{ type: 'string', pattern: '^test$' }],
            },
          },
        },
      },
    },
    { emitRegexValidation: false },
  );

  const output = g.render();
  expect(output).not.toContain('RegExp');
});

test('validates pattern on struct property in toJson', () => {
  const g = TypeGenerator.forStruct(
    'Config',
    {
      properties: {
        email: {
          type: 'string',
          pattern: '^[^@]+@[^@]+$',
        },
      },
    },
    { emitRegexValidation: true },
  );

  const output = g.render();
  expect(output).toContain("new RegExp('^[^@]+@[^@]+$')");
  expect(output).toContain("result['email']");
});

test('pattern from $ref is resolved correctly', () => {
  const g = TypeGenerator.forStruct(
    'Test',
    {
      $ref: '#/definitions/config',
      definitions: {
        config: {
          properties: {
            duration: {
              oneOf: [{ $ref: '#/definitions/durationString' }],
            },
          },
        },
        durationString: {
          type: 'string',
          pattern: '^[0-9]+s$',
        },
      },
    },
    { emitRegexValidation: true },
  );

  const output = g.render();
  expect(output).toContain("new RegExp('^[0-9]+s$')");
});
