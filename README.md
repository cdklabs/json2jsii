# json2jsii

> Generates jsii-compatible structs from JSON schemas

## Usage

```ts
const g = TypeGenerator.forStruct('Person', {
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

fs.writeFileSync('gen/ts/person.ts', g.render());
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
  readonly color?: PersonColor;

}

/**
 * Converts an object of type 'Person' to JSON representation.
 */
export function toJson_Person(obj: Person | undefined): Record<string, any> | undefined {
  if (obj === undefined) { return undefined; }
  const result = {
    'name': toJson_Name(obj.name),
    'color': obj.color,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: i[1] }), {});
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
   * @schema Name#FirstName
   */
  readonly firstName: string;

  /**
   * The last name of the person
   *
   * @schema Name#last_name
   */
  readonly lastName: string;

}

/**
 * Converts an object of type 'Name' to JSON representation.
 */
export function toJson_Name(obj: Name | undefined): Record<string, any> | undefined {
  if (obj === undefined) { return undefined; }
  const result = {
    'FirstName': obj.firstName,
    'last_name': obj.lastName,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: i[1] }), {});
}

/**
 * Favorite color. Default is green
 *
 * @default green
 * @schema PersonColor
 */
export enum PersonColor {
  /** red */
  RED = \\"red\\",
  /** green */
  GREEN = \\"green\\",
  /** blue */
  BLUE = \\"blue\\",
  /** yellow */
  YELLOW = \\"yellow\\",
}
```

Since property names of generated structs are converted to camel case in order
to comply with JSII requirements, json2jsii will also generate a `toJson_Xxx`
function for each generated struct. These functions can be used to convert back
a data type to the schema format.

For example:

```ts
toJson_Name({
  firstName: 'Boom',
  lastName: 'Bam'
})
```

Will return:

```json
{
  "FirstName": "Boom",
  "last_name": "Bam"
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

