import { TypeGenerator } from '../lib';
import { srcmak } from 'jsii-srcmak';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

test('language bindings', async () => {
  const g = new TypeGenerator();

  g.emitType('Name', {
    properties: {
      first: { type: 'string' },
      middle: { type: 'string' },
      last: { type: 'string' },
    },
    required: [ 'first', 'last' ],
  });

  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'json2jsii'));
  await g.writeToFile(path.join(workdir, 'typescript', 'index.ts'));

  await fs.mkdir(path.join(workdir, 'java'));

  await srcmak(path.join(workdir, 'typescript'), {
    java: {
      outdir: path.join(workdir, 'java'),
      package: 'org.myorg',
    },
    python: {
      outdir: path.join(workdir, 'python'),
      moduleName: 'myorg',
    },
  });

  expect(await fs.readFile(path.join(workdir, 'python/myorg/__init__.py'), 'utf-8')).toMatchSnapshot();
  expect(await fs.readFile(path.join(workdir, 'java/src/main/java/org/myorg/Name.java'), 'utf-8')).toMatchSnapshot();

  await fs.rmdir(workdir, { recursive: true });
});