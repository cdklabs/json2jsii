import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { srcmak } from 'jsii-srcmak';
import { TypeGenerator } from '../src';

export async function generate(gen: TypeGenerator) {
  const source = gen.render();
  const deps = ['@types/node'].map(d => path.dirname(require.resolve(`${d}/package.json`)));

  // check that the output compiles & is jsii-compatible
  await mkdtemp(async workdir => {
    await fs.writeFile(path.join(workdir, 'index.ts'), source);
    await srcmak(workdir, { deps });
  });

  return source;
}

async function mkdtemp(closure: (dir: string) => Promise<void>) {
  const workdir = await fs.mkdtemp(path.join(os.tmpdir(), 'json2jsii-'));
  await closure(workdir);
  await fs.rm(workdir, { recursive: true, force: true });
}
