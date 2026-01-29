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
    { validateRegexp: true },
  );

  expect(g.render()).toMatchSnapshot();
});
