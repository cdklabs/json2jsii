import { readdirSync, readFileSync } from 'fs';
import * as path from 'path';
import { generate } from './util';
import { TypeGenerator } from '../src';

jest.setTimeout(1000 * 60 * 5);

test.each(readdirSync(path.join(__dirname, 'fixtures')))('generate struct for %s', async file => {
  const schema = JSON.parse(readFileSync(path.join(__dirname, 'fixtures', file), 'utf-8'));
  const gen = TypeGenerator.forStruct('MyStruct', schema);
  const source = await generate(gen);
  expect(source).toMatchSnapshot();
});
