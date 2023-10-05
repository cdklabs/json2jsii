import { JSONSchema4 } from 'json-schema';
import { generate } from './util';
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

  which('uses non-symbolic values', {
    properties: {
      Timeframe: {
        description: 'The SLO time window options. Allowed enum values: 7d,30d,90d',
        type: 'string',
        enum: [
          '7d',
          '30d',
          '90d',
        ],
      },
    },
  });

  which('has number values', {
    properties: {
      Percentiles: {
        type: 'number',
        enum: [
          .9,
          .95,
          .99,
        ],
      },
    },
  });

  which('has integer values', {
    properties: {
      Days: {
        type: 'integer',
        enum: [
          1,
          2,
          3,
        ],
      },
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


test('fails when trying to resolve an undefined $ref', () => {
  const g = new TypeGenerator();
  expect(() => g.addType('Foo', { $ref: 'unresolvable' })).toThrow(/invalid \$ref {\"\$ref\":\"unresolvable\"}/);
  expect(() => g.addType('Foo', { $ref: '#/definitions/unresolvable' })).toThrow(/unable to find a definition for the \$ref \"unresolvable\"/);
});

test('if "toJson" is disabled, toJson functions are not generated', async () => {
  const schema: JSONSchema4 = {
    properties: {
      bar: { type: 'string' },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
  });

  expect(await generate(gen)).toMatchSnapshot();
});

test('type can be an array with null and a single non null type', async () => {

  const schema: JSONSchema4 = {
    properties: {
      bar: { type: ['null', 'boolean'] },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
  });

  expect(await generate(gen)).toMatchSnapshot();

});

test('additionalProperties when type is defined as array', async () => {

  const schema: JSONSchema4 = {
    properties: {
      foo: {
        type: ['null', 'object'],
        additionalProperties: {
          type: 'string',
        },
      },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
  });

  expect(await generate(gen)).toMatchSnapshot();

});

test('properties when type is defined as array', async () => {

  const schema: JSONSchema4 = {
    type: ['null', 'object'],
    properties: {
      bar: { type: 'string' },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
  });

  expect(await generate(gen)).toMatchSnapshot();

});

test('enum when type is defined as array', async () => {

  const schema: JSONSchema4 = {
    properties: {
      foo: {
        type: ['null', 'string'],
        enum: ['val1', 'val2'],
      },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
  });

  expect(await generate(gen)).toMatchSnapshot();

});

test('sanitize string enum when one of the values is null', async () => {

  const schema: JSONSchema4 = {
    properties: {
      foo: {
        type: ['null', 'string'],
        enum: ['val1', null],
      },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
    sanitizeEnums: true,
  });

  expect(await generate(gen)).toMatchSnapshot();

});

test('sanitize number enum when one of the values is null', async () => {

  const schema: JSONSchema4 = {
    properties: {
      foo: {
        type: ['null', 'number'],
        enum: [3, null],
      },
    },
  };

  const gen = TypeGenerator.forStruct('Foo', schema, {
    toJson: false,
    sanitizeEnums: true,
  });

  expect(await generate(gen)).toMatchSnapshot();

});

test('custom ref normalization', async () => {

  const foo = 'io.k8s.v1beta1.Foo';
  const bar = 'Bar';

  const gen = new TypeGenerator({
    renderTypeName: (def: string) => {
      return def.split('.').slice(2, 4).join('');
    },
  });

  gen.addDefinition(foo, { properties: { props: { type: 'number' } } });

  // two structs, each referencing a different version
  gen.addDefinition(bar, { properties: { prop: { $ref: `#/definitions/${foo}` } } });
  gen.emitType(bar);

  const code = await generate(gen);
  expect(code).toMatchSnapshot();

});

test('shared namespace references', async () => {

  const foo1 = 'io.k8s.v1beta1.Foo';
  const foo2 = 'io.k8s.v1.Foo';
  const bar1 = 'Bar1';
  const bar2 = 'Bar2';

  const gen = new TypeGenerator();

  // two versions of the same struct
  gen.addDefinition(foo1, { properties: { props: { type: 'number' } } });
  gen.addDefinition(foo2, { properties: { props: { type: 'string' } } });

  // two structs, each referencing a different version
  gen.addDefinition(bar1, { properties: { prop: { $ref: `#/definitions/${foo1}` } } });
  gen.addDefinition(bar2, { properties: { prop: { $ref: `#/definitions/${foo2}` } } });

  gen.emitType(bar1);
  gen.emitType(bar2);

  const code = await generate(gen);

  // we expect the code to contain Bar1 and Bar2 that reference foo1 and
  // foo2 respectively
  expect(code).toMatchSnapshot();
});

function which(name: string, schema: JSONSchema4, definitions?: JSONSchema4) {
  test(name, async () => {
    const gen = new TypeGenerator(definitions);
    gen.emitType('TestType', schema, 'fqn.of.TestType');
    expect(await generate(gen)).toMatchSnapshot();
  });
}
