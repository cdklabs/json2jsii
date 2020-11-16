# json2jsii

> Generates jsii-compatible structs from JSON schemas

## Usage

```ts
const g = new TypeGenerator({
  definitions: {
    Name: {
      description: 'Represents a name of a person',
      required: [ 'firstName', 'lastName' ],
      properties: {
        firstName: {
          type: 'string',
          description: 'The first name of the person',
        },
        lastName: {
          type: 'string',
          description: 'The last name of the person',
        },
      },
    },
  },
});

// definitions can also be added like this:
g.addDefinition('Person', {
  required: [ 'name' ],
  properties: {
    name: {
      description: 'The person\'s name',
      $ref: '#/definitions/Name',
    },
    color: {
      description: 'Favorite color. Default is green',
      enum: [ 'red', 'green', 'blue', 'yellow' ],
    },
  },
});

// this will emit the specified type & recursively all the referenced types.
g.emitType('Person');

fs.writeFileSync('gen/ts/person.ts', await g.render());
```

Then, `gen/ts/person.ts` will look like this;

```ts
/**
 * @schema Person
 */
export interface Person {
  /**
   * The person's name
   *
   * @schema Person#name
   */
  readonly name: Name;

  /**
   * Favorite color. Default is green
   *
   * @default green
   * @schema Person#color
   */
  readonly color?: any;
}

/**
 * Represents a name of a person
 *
 * @schema Name
 */
export interface Name {
  /**
   * The first name of the person
   *
   * @schema Name#firstName
   */
  readonly firstName: string;

  /**
   * The last name of the person
   *
   * @schema Name#lastName
   */
  readonly lastName: string;
}
```

## Use cases

### Type aliases

It is possible to offer an alias to a type definition using `addAlias(from,
to)`. The type generator will resolve any references to the original type with
the alias:

```ts
const gen = new TypeGenerator();
gen.addDefinition('TypeA', { type: 'object', properties: { ref: { $ref: '#/definitions/TypeB' } } } );
gen.addDefinition('TypeC', { type: 'object', properties: { field: { type: 'string' } } });
gen.addAlias('TypeB', 'TypeC');

gen.emitType('TypeA');
```

This will output:

```ts
interface TypeA {
  readonly ref: TypeC;
}

interface TypeC {
  readonly field: string;
}
```

## Language bindings

Once you generate jsii-compatible TypeScript source (such as `person.ts` above),
you can use [jsii-srcmak](https://github.com/eladb/jsii-srcmak) in order to
produce source code in any of the jsii supported languages.

The following command will produce Python sources for the `Person` types:

```shell
$ jsii-srcmak gen/ts \
  --python-outdir gen/py --python-module-name person \
  --java-outdir gen/java --java-package person
```

See the [jsii-srcmak](https://github.com/eladb/jsii-srcmak) for library usage.

## Contributions

All contributions are celebrated.

## License

Distributed under the [Apache 2.0](./LICENSE) license.
