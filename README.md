# json2jsii

> Generates jsii-compatible structs from JSON schemas

## Usage

```ts
const g = TypeGenerator.forStruct('Person', {
  definitions: {
    Name: {
      description: 'Represents a name of a person',
      required: ['FirstName', 'last_name'],
      properties: {
        FirstName: {
          type: 'string',
          description: 'The first name of the person',
        },
        last_name: {
          type: 'string',
          description: 'The last name of the person',
        },
      },
    },
  },
  required: ['name'],
  properties: {
    name: {
      description: 'The person\'s name',
      $ref: '#/definitions/Name',
    },
    favorite_color: {
      description: 'Favorite color. Default is green',
      enum: ['red', 'green', 'blue', 'yellow'],
    },
  },
});

fs.writeFileSync('person.ts', g.render());
```

<details>
<summary>person.ts</summary>

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
   * @schema Person#favorite_color
   */
  readonly favoriteColor?: PersonFavoriteColor;

}

/**
 * Converts an object of type 'Person' to JSON representation.
 */
/* eslint-disable max-len, quote-props */
export function toJson_Person(obj: Person | undefined): Record<string, any> | undefined {
  if (obj === undefined) { return undefined; }
  const result = {
    'name': toJson_Name(obj.name),
    'favorite_color': obj.favoriteColor,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: i[1] }), {});
}
/* eslint-enable max-len, quote-props */

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
/* eslint-disable max-len, quote-props */
export function toJson_Name(obj: Name | undefined): Record<string, any> | undefined {
  if (obj === undefined) { return undefined; }
  const result = {
    'FirstName': obj.firstName,
    'last_name': obj.lastName,
  };
  // filter undefined values
  return Object.entries(result).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: i[1] }), {});
}
/* eslint-enable max-len, quote-props */

/**
 * Favorite color. Default is green
 *
 * @default green
 * @schema PersonFavoriteColor
 */
export enum PersonFavoriteColor {
  /** red */
  RED = 'red',
  /** green */
  GREEN = 'green',
  /** blue */
  BLUE = 'blue',
  /** yellow */
  YELLOW = 'yellow',
}
```

</details>

The generated code includes JSII structs (TypeScript interfaces) and enums based
on the schema (`Person`, `Name` and `PersonFavoriteColor`) as well as a function
`toJson_Xyz()` for each struct.

The `toJson()` functions are required in order to serialize objects back to their
original schema format.

For example, the following expression:

```ts
toJson_Person({
  name: {
    firstName: 'Jordan',
    lastName: 'McJordan'
  },
  favoriteColor: PersonFavoriteColor.GREEN
})
```

Will return:

```json
{
  "name": {
    "FirstName": "Jordan",
    "last_name": "McJordan"
  },
  "favorite_color": "green"
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
you can use [jsii-srcmak](https://github.com/cdklabs/jsii-srcmak) in order to
produce source code in any of the jsii supported languages.

The following command will produce Python sources for the `Person` types:

```console
$ jsii-srcmak gen/ts \
  --python-outdir gen/py --python-module-name person \
  --java-outdir gen/java --java-package person
```

See the [jsii-srcmak](https://github.com/eladb/jsii-srcmak) for library usage.

## Known Limitations

### Unions of interfaces are not supported ([#1120](https://github.com/cdklabs/json2jsii/issues/1120))

Only primitive types are supported in `oneOf`/`anyOf` unions. Unions of complex types fall back to `any`:

```jsonc
// ❌ Not supported - falls back to `any`
{ "oneOf": [{ "$ref": "#/definitions/TypeA" }, { "$ref": "#/definitions/TypeB" }] }

// ✅ Supported - primitive union
{ "oneOf": [{ "type": "string" }, { "type": "number" }] }
```

### `$ref` must start with `#/definitions/` or `#/$defs/` ([#1195](https://github.com/cdklabs/json2jsii/issues/1195))

Only local definition references are supported:

```jsonc
// ❌ Not supported
{ "$ref": "#/properties/foo" }
{ "$ref": "https://example.com/schemas/common.json" }

// ✅ Supported
{ "$ref": "#/definitions/MyType" }
{ "$ref": "#/$defs/MyType" }
```

### Nested recursive local references fail ([#1197](https://github.com/cdklabs/json2jsii/issues/1197))

Code generation fails for schemas with nested recursive `$ref` patterns.

## Contributions

All contributions are celebrated.

## License

Distributed under the [Apache 2.0](./LICENSE) license.
