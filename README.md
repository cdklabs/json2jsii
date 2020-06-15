# json2jsii

> Generates jsii-compatible structs from JSON schemas

## Usage

```ts
const g = new TypeGenerator();
g.emitType('Person', {
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
    color: {
      description: 'Favorite color. Default is green',
      enum: [ 'red', 'green', 'blue', 'yellow' ],
    },
  },
});

const code = new CodeMaker();
code.openFile('person.ts');
g.generate(code);
code.closeFile('person.ts');

await code.save('.');
```

Then, `person.ts` will look like this;

```ts
/**
 * @schema Person
 */
export interface Person {
  /**
   * The first name of the person
   *
   * @schema Person#firstName
   */
  readonly firstName: string;

  /**
   * The last name of the person
   *
   * @schema Person#lastName
   */
  readonly lastName: string;

  /**
   * Favorite color. Default is green
   *
   * @default green
   * @schema Person#color
   */
  readonly color?: any;
}
```

## Contributions

All contributions are celebrated.

## License

Distributed under the [Apache 2.0](./LICENSE) license.
