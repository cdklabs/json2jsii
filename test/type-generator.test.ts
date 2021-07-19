import { promises as fs, readFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { srcmak } from 'jsii-srcmak';
import { JSONSchema4 } from 'json-schema';
import { TypeGenerator } from '../src';

jest.setTimeout(3 * 60_000); // 1min

describe('unions', () => {

  which('include primitives', {
    oneOf: [
      { type: 'string' },
      { type: 'number' },
    ],
  });

  which('constraints are ignored for objects', {
    description: 'An ordered list of route rules for HTTP traffic.',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        fault: {
          type: 'object',
          description: 'Fault injection policy to apply on HTTP traffic at\nthe client side.',
          properties: {
            delay: {
              oneOf: [
                {
                  anyOf: [
                    { required: ['fixedDelay'] },
                    { required: ['exponentialDelay'] },
                  ],
                },
                { required: ['fixedDelay'] },
                { required: ['exponentialDelay'] },
              ],
              properties: {
                exponentialDelay: {
                  type: 'string',
                },
                fixedDelay: {
                  description: 'Add a fixed delay before forwarding the request.',
                  type: 'string',
                },
                percent: {
                  description: 'Percentage of requests on which the delay\nwill be injected (0-100).',
                  format: 'int32',
                  type: 'integer',
                },
                percentage: {
                  description: 'Percentage of requests on which the delay\nwill be injected.',
                  properties: {
                    value: {
                      format: 'double',
                      type: 'number',
                    },
                  },
                  type: 'object',
                },
              },
              type: 'object',
            },
          },
        },
      },
    },
  });

});


describe('structs', () => {

  which('has primitive types and collections of primitive types', {
    type: 'object',
    properties: {
      stringValue: { type: 'string' },
      boolValue: { type: 'boolean' },
      numberValue: { type: 'number' },
      integerValue: { type: 'integer' },
      arrayOfString: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  });

  which('has a field that references another struct (with required fields)', {
    type: 'object',
    properties: {
      other: {
        $ref: '#/definitions/Other',
      },
    },
  }, {
    definitions: {
      Other: {
        type: 'object',
        properties: {
          stringValue: { type: 'string' },
        },
        required: ['stringValue'],
      },
    },
  });

  which('references itself', {
    type: 'object',
    properties: {
      entrypoint: {
        $ref: '#/definitions/MyType',
      },
    },
  }, {
    definitions: {
      MyType: {
        type: 'object',
        properties: {
          self: { $ref: '#/definitions/MyType' },
        },
      },
    },
  });

  which('array of structs is considered optional', {
    type: 'object',
    properties: {
      shouldBeRequired: { $ref: '#/definitions/ItemType' },
      mapShouldBeOptional: {
        type: 'object',
        additionalProperties: { $ref: '#/definitions/ItemType' },
      },
      arrayShouldBeOptional: {
        type: 'array',
        items: {
          $ref: '#/definitions/ItemType',
        },
      },
    },
  }, {
    definitions: {
      ItemType: {
        type: 'object',
        required: ['requiredField'],
        properties: {
          requiredField: { type: 'string' },
        },
      },
    },
  });

  which('includes required fields', {
    required: [
      'minReadySeconds',
      'revisionHistoryLimit',
      'NonCamelCaseRequired',
    ],
    type: 'object',
    properties: {
      minReadySeconds: {
        description: 'Minimum number of seconds for which a newly created pod should be ready without any of its container crashing, for it to be considered available. Defaults to 0 (pod will be considered available as soon as it is ready)',
        format: 'int32',
        type: 'integer',
      },
      paused: {
        description: 'Indicates that the deployment is paused.',
        type: 'boolean',
      },
      progressDeadlineSeconds: {
        description: 'The maximum time in seconds for a deployment to make progress before it is considered to be failed. The deployment controller will continue to process failed deployments and a condition with a ProgressDeadlineExceeded reason will be surfaced in the deployment status. Note that progress will not be estimated during the time a deployment is paused. Defaults to 600s.',
        format: 'int32',
        type: 'integer',
      },
      replicas: {
        description: 'Number of desired pods. This is a pointer to distinguish between explicit zero and not specified. Defaults to 1.',
        format: 'int32',
        type: 'integer',
      },
      revisionHistoryLimit: {
        description: 'The number of old ReplicaSets to retain to allow rollback. This is a pointer to distinguish between explicit zero and not specified. Defaults to 10.',
        format: 'int32',
        type: 'integer',
      },
      NonCamelCaseRequired: {
        type: 'string',
      },
    },
  });

  which('if we have "properties" and "type" is omitted, it is considered a struct', {
    properties: {
      foo: {
        type: 'string',
      },
    },
  });

});


describe('documentation', () => {

  which('does not render if not defined', {
    type: 'object',
    properties: {
      field: {
        type: 'boolean',
      },
    },
  });

  which('renders based on description', {
    type: 'object',
    properties: {
      field: {
        description: 'hello, description',
        type: 'string',
      },
    },
  });

  which('"*/" is is escaped', {
    type: 'object',
    properties: {
      field: {
        description: 'hello */world',
        type: 'string',
      },
    },
  });

});

describe('enums', () => {

  which('renders a typescript enum', {
    type: 'object',
    required: ['firstEnum'],
    properties: {
      firstEnum: {
        description: 'description of first enum',
        type: 'string',
        enum: ['value1', 'value2', 'value-of-three', 'valueOfFour'],
      },
      child: {
        type: 'object',
        properties: {
          secondEnum: {
            description: 'description of second enum',
            type: 'string',
            enum: ['hey', 'enum values can be crazy', 'yes>>123'],
          },
        },
      },
    },
  });

  which('without type implies "string"', {
    properties: {
      Color: { enum: ['red', 'green', 'blue'] },
    },
  });
});

which('primitives', {
  type: 'object',
  properties: {
    stringValue: { type: 'string' },
    booleanValue: { type: 'boolean' },
    dateValue: { type: 'string', format: 'date-time' },
    dateValueImplicitType: { format: 'date-time' },
    anyValue: { type: 'any' },
    nullValue: { type: 'null' },
    numberValue: { type: 'number' },
    integerValue: { type: 'integer' },
  },
});

which('camel casing', {
  properties: {
    'CamelCase1': { type: 'string' },
    'Camel_Case2': { type: 'string' },
    'camel_case_3': { type: 'string' },
    'CAMEL_CASE_4': { type: 'string' },
    'camel-case-5': { type: 'string' },
  },
});

describe('type aliases', () => {

  test('alias to a custom type', () => {
    // GIVEN
    const gen = new TypeGenerator();
    gen.addDefinition('TypeB', { type: 'object', properties: { refToTypeA: { $ref: '#/definitions/TypeA' } } });
    gen.emitCustomType('NewType', code => code.line('// this is NewType'));

    // WHEN
    gen.addAlias('TypeA', 'NewType'); // this is a type alias
    gen.emitType('TypeB');

    // THEN
    expect(gen.render()).toMatchSnapshot();
  });

  test('alias to a definition', () => {
    // GIVEN
    const gen = new TypeGenerator();
    gen.addDefinition('TypeA', { type: 'object', properties: { ref: { $ref: '#/definitions/TypeB' } } } );
    gen.addDefinition('TypeC', { type: 'object', properties: { field: { type: 'string' } } });

    // WHEN
    gen.addAlias('TypeB', 'TypeC');

    // THEN
    gen.emitType('TypeA');
    expect(gen.render()).toMatchSnapshot();
  });
});

test('forStruct', async () => {
  const schema = JSON.parse(readFileSync(path.join(__dirname, 'fixtures', 'eks.json'), 'utf-8'));
  const gen = TypeGenerator.forStruct('EksProps', schema);
  const source = await generate(gen);
  expect(source).toMatchSnapshot();
});

function which(name: string, schema: JSONSchema4, definitions?: JSONSchema4) {
  test(name, async () => {
    const gen = new TypeGenerator(definitions);
    gen.emitType('TestType', schema, 'fqn.of.TestType');
    expect(await generate(gen)).toMatchSnapshot();
  });
}

async function generate(gen: TypeGenerator) {
  const source = gen.render();
  const deps = ['@types/node'].map(d => path.dirname(require.resolve(`${d}/package.json`)));

  // check that the output compiles & is jsii-compatible
  await mkdtemp(async workdir => {
    await fs.writeFile(path.join(workdir, 'index.ts'), source);
    await srcmak(workdir, { deps });
  });

  return source;
}

async function mkdtemp(closure: (dir: string) => Promise<void>) {
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'cdk8s-'));
  await closure(workdir);
}
