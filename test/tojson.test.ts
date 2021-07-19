
import { spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { JSONSchema4 } from 'json-schema';
import { TypeGenerator } from '../src';
import { toJsonFunction } from '../src/jsonify';

test('primitives', () => {
  const f = compile({
    properties: {
      StringProperty: { type: 'string' },
      BooleanProperty: { type: 'boolean' },
      NumberProperty: { type: 'number' },
      With_UnderScore: { type: 'integer' },
    },
    required: [
      'StringProperty',
    ],
  });

  expect(f({
    stringProperty: 'hello', booleanProperty: false, numberProperty: 1234, withUnderScore: 8989,
  })).toStrictEqual({
    StringProperty: 'hello', BooleanProperty: false, NumberProperty: 1234, With_UnderScore: 8989,
  });

  expect(f({
    stringProperty: 'hello, world', numberProperty: undefined,
  })).toStrictEqual({
    StringProperty: 'hello, world',
  });
});

test('names can get crazy', () => {
  const f = compile({
    properties: {
      'hyphen-name': { type: 'string' },
      '$nameWithDolar': { type: 'string' },
      'name with spaces': { type: 'string' },
    },
  });

  expect(f({
    hyphenName: 'boomboom',
    nameWithDolar: 'hey',
    nameWithSpaces: 'glow',
  })).toStrictEqual({
    'hyphen-name': 'boomboom',
    '$nameWithDolar': 'hey',
    'name with spaces': 'glow',
  });
});

test('complex types', () => {
  const f = compile({
    definitions: {
      YourType: {
        properties: {
          John: { type: 'array', items: { type: 'string' } },
        },
      },
      MyType: {
        properties: {
          Foo: { type: 'number' },
          Bar: { type: 'string' },
          Nested: { $ref: '#/definitions/YourType' },
        },
        required: ['Nested'],
      },
    },
    properties: {
      ComplexType: { $ref: '#/definitions/MyType' },
    },
  });

  expect(f({
    complexType: { foo: 1234, bar: 'hey there', nested: { john: ['foo'] } },
  })).toStrictEqual({
    ComplexType: { Foo: 1234, Bar: 'hey there', Nested: { John: ['foo'] } },
  });
});

describe('arrays', () => {

  test('of primitives', () => {
    const f = compile({
      properties: {
        ArrayProp: { type: 'array', items: { type: 'string' } },
      },
    });

    expect(f({
      arrayProp: ['bello', 'aoll'],
    })).toStrictEqual({
      ArrayProp: ['bello', 'aoll'],
    });
  });

  test('of complex types', () => {
    const f = compile({
      definitions: {
        MyType: {
          properties: {
            Foo: { type: 'number' },
            Bar: { type: 'string' },
          },
        },
      },
      properties: {
        Array_Of_complex: { type: 'array', items: { $ref: '#/definitions/MyType' } },
      },
    });

    expect(f({
      arrayOfComplex: [{ foo: 122 }, { bar: 'hello' }, { foo: 88, bar: 'world' }],
    })).toStrictEqual({
      Array_Of_complex: [{ Foo: 122 }, { Bar: 'hello' }, { Foo: 88, Bar: 'world' }],
    });
  });

});

test('any', () => {
  const f = compile({
    properties: {
      MyAny: { type: 'object' },
    },
  });

  expect(f({ myAny: 177 })).toStrictEqual({ MyAny: 177 });
  expect(f({ myAny: 'hello' })).toStrictEqual({ MyAny: 'hello' });
  expect(f({ myAny: ['hello', 889] })).toStrictEqual({ MyAny: ['hello', 889] });
});


describe('maps', () => {
  test('of primitives', () => {
    const f = compile({
      properties: {
        StringMap: { additionalProperties: { type: 'string' } },
        NumberMap: { additionalProperties: { type: 'number' } },
      },
    });

    expect(f({
      stringMap: {
        hello: 'string',
        world: 'strong',
      },
      numberMap: {
        hello: 10,
        world: 20,
      },
    })).toStrictEqual({
      StringMap: {
        hello: 'string',
        world: 'strong',
      },
      NumberMap: {
        hello: 10,
        world: 20,
      },
    });

    expect(f({
      stringMap: undefined,
      numberMap: {
        hello: undefined,
        world: 11,
      },
    })).toStrictEqual({
      NumberMap: {
        world: 11,
      },
    });
  });

  test('of complex', () => {
    const f = compile({
      definitions: {
        MyType: {
          properties: {
            Foo: { type: 'number' },
            Bar: { type: 'string' },
          },
        },
      },
      properties: {
        ComplexMap: { additionalProperties: { $ref: '#/definitions/MyType' } },
      },
    });

    expect(f({
      complexMap: {
        foya: { foo: 123, bar: 'barbar' },
        hello_world: { foo: 3333 },
      },
    })).toStrictEqual({
      ComplexMap: {
        foya: { Foo: 123, Bar: 'barbar' },
        hello_world: { Foo: 3333 },
      },
    });
  });
});

test('enums', () => {
  const f = compile({
    properties: {
      MyEnum: { enum: ['one', 'two', 'three'] },
      YourEnum: { enum: ['jo', 'shmo'] },
    },
  });

  expect(f({
    myEnum: 'two',
    yourEnum: undefined,
  })).toStrictEqual({
    MyEnum: 'two',
  });
});

test('date', () => {
  const f = compile({
    properties: {
      DateTime: { type: 'string', format: 'date-time' },
    },
  });

  expect(f({
    dateTime: new Date('2021-07-19T12:08:52.210Z'),
  })).toStrictEqual({
    DateTime: '2021-07-19T12:08:52.210Z',
  });

  expect(f({ dateTime: undefined })).toStrictEqual({});
});

/**
 * Generates structs from this JSON schema and returns a compiled versio of the
 * toJson method for the top-level struct.
 */
function compile(schema: JSONSchema4): (x: any) => any {
  // generate code into workdir
  const workdir = mkdtempSync(join(tmpdir(), 'tojson.'));
  const gen = TypeGenerator.forStruct('MyStruct', schema);
  const code = gen.render();
  expect(code).toMatchSnapshot();

  writeFileSync(join(workdir, 'index.ts'), code);

  try {
    // compile using the typescript compiler
    const tsc = require.resolve('typescript/bin/tsc');
    spawnSync(tsc, ['index.ts'], { cwd: workdir });

    // import the compiled javascript code into this process (wow)
    const source = join(workdir, 'index.js');

    const fnName = toJsonFunction.nameOf('MyStruct');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(source)[fnName];
  } catch (e) {
    throw new Error(`Compilation error: ${e}. Workdir: ${workdir}`);
  }
}