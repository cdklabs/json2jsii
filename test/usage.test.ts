import { TypeGenerator } from '../src';

test('readme example', () => {
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

  expect(g.render()).toMatchSnapshot();
});
