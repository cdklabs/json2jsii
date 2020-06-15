const { TypeScriptLibraryProject, Semver, Jest, Eslint } = require('projen');
const { Mergify } = require('projen/lib/mergify');

const project = new TypeScriptLibraryProject({
  name: 'json2jsii',
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/joe/schmo.git',
  dependencies: {
    'json-schema': Semver.caret('0.2.5'),
    'codemaker': Semver.caret('1.6.0')
  },
  devDependencies: {
    '@types/node': Semver.caret('14.0.13'),
    '@types/json-schema': Semver.caret('7.0.5'),
    'typescript': Semver.caret('3.9.5'),
    'jsii-srcmak': Semver.caret('0.0.4')
  }
});

new Jest(project);
new Mergify(project);
new Eslint(project);

project.synth();
