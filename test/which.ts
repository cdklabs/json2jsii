import { JSONSchema4 } from 'json-schema';
import { TypeGenerator, TypeGeneratorOptions } from '../src';
import { generate } from './util';

type WhichParams = Parameters<(name: string, schema: JSONSchema4, options?: TypeGeneratorOptions) => void>;

interface WhichFunction {
  (...args: WhichParams): void;
  usingTransforms: (...transforms: string[]) => (...args: WhichParams) => void;
}

export const which: WhichFunction = (name: string, schema: JSONSchema4, options?: TypeGeneratorOptions) => {
  test(name, async () => {
    const gen = new TypeGenerator(options);
    gen.emitType('TestType', JSON.parse(JSON.stringify(schema)), 'fqn.of.TestType');
    expect(await generate(gen)).toMatchSnapshot();
  });
};

which.usingTransforms = (...transforms: string[]) => {
  return (...args: WhichParams) => {
    describe(args[0], () => {
      for (const transform of transforms) {
        describe(transform, () => {
          which('enabled', args[1], {
            ...args[2],
            transformations: {
              [transform]: true,
            },
          });
          which('disabled', args[1], {
            ...args[2],
            transformations: {
              [transform]: false,
            },
          });
        });
      }
    });
  };
};
