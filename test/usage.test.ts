import { TypeGenerator } from '../lib';
import { CodeMaker } from 'codemaker';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

test('basic usage', async () => {
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

  const outdir = await fs.mkdtemp(path.join(os.tmpdir(), 'json2jsii'));
  await code.save(outdir);

  expect(await fs.readFile(path.join(outdir, 'person.ts'), 'utf-8')).toMatchSnapshot();
});