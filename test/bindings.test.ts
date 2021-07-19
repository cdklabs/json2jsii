import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { srcmak } from 'jsii-srcmak';
import { TypeGenerator } from '../src';

jest.setTimeout(5 * 60 * 1000);

test('language bindings', async () => {
  const g = new TypeGenerator();

  g.addType('Name', {
    properties: {
      first: { type: 'string' },
      middle: { type: 'string' },
      last: { type: 'string' },
      objectWithTypedAdditionalPropertiesOnly: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
      },
      objectWithPropertiesAndBooleanAdditionalProperties: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: {},
      },
      objectWithPropertiesAndTypedAdditionalProperties: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        additionalProperties: {
          type: 'string',
        },
      },
    },
    additionalProperties: true,
    required: ['first', 'last'],
  });

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'json2jsii'));

  const src = path.join(workdir, 'tyepscript');
  fs.mkdirSync(src);
  fs.writeFileSync(path.join(src, 'index.ts'), await g.render());

  await srcmak(src, {
    java: {
      outdir: path.join(workdir, 'java'),
      package: 'org.myorg',
    },
    python: {
      outdir: path.join(workdir, 'python'),
      moduleName: 'myorg',
    },
    golang: {
      outdir: path.join(workdir, 'golang'),
      packageName: 'myorg',
      moduleName: 'myorg',
    },
    csharp: {
      outdir: path.join(workdir, 'csharp'),
      namespace: 'myorg',
    },
  });

  expect(readFile(path.join(workdir, 'python/myorg/__init__.py'))).toMatchSnapshot();
  expect(readFile(path.join(workdir, 'java/src/main/java/org/myorg/Name.java'), ['@javax.annotation.Generated'])).toMatchSnapshot();
  expect(readFile(path.join(workdir, 'golang/myorg/myorg.go'))).toMatchSnapshot();
  expect(readFile(path.join(workdir, 'csharp/myorg/myorg/IName.cs'))).toMatchSnapshot();
});

function readFile(filePath: string, ignoreLines: string[] = []) {
  const lines = (fs.readFileSync(filePath, 'utf-8')).split('\n');
  const shouldInclude = (line: string) => !ignoreLines.find(pattern => line.includes(pattern));
  return lines.filter(shouldInclude).join('\n');
}
