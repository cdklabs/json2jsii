import { TypeGenerator } from '../lib';

test('example with $ref', async () => {
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

  g.addType('Person', {
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

  expect(await g.render()).toMatchSnapshot();
});

test('fails when trying to resolve an undefined $ref', () => {
  const g = new TypeGenerator();
  expect(() => g.addType('Foo', { $ref: 'unresolvable' })).toThrow(/invalid \$ref {\"\$ref\":\"unresolvable\"}/);
  expect(() => g.addType('Foo', { $ref: '#/definitions/unresolvable' })).toThrow(/unable to find a definition for the \$ref \"unresolvable\"/);
});