import { Code } from '../lib/code';

test('empty newlines are not indented', () => {
  // GIVEN
  const code = new Code();

  // WHEN
  code.openBlock('open');
  code.line('before empty line');
  code.line();
  code.line('after empty line');
  code.closeBlock();

  // THEN
  expect(code.render()).toMatchInlineSnapshot(`
    "open {
      before empty line

      after empty line
    }"
  `);
});
