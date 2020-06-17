import { TypeGenerator } from '../lib';
import { CodeMaker } from 'codemaker';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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

  g.emitType('Person', {
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

  const code = new CodeMaker();
  code.openFile('person.ts');
  g.writeToCodeMaker(code);
  code.closeFile('person.ts');

  const outdir = fs.mkdtempSync(path.join(os.tmpdir(), 'json2jsii'));
  await code.save(outdir);

  expect(fs.readFileSync(path.join(outdir, 'person.ts'), 'utf-8')).toMatchSnapshot();
});

test('fails when trying to resolve an undefined $ref', () => {
  const g = new TypeGenerator();
  expect(() => g.emitType('Foo', { $ref: 'unresolvable' })).toThrow(/invalid \$ref {\"\$ref\":\"unresolvable\"}/);
  expect(() => g.emitType('Foo', { $ref: '#/definitions/unresolvable' })).toThrow(/unable to find a definition for the \$ref \"unresolvable\"/);
});