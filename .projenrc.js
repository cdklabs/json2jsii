const { TypeScriptLibraryProject, Semver } = require('projen');

const project = new TypeScriptLibraryProject({
  name: 'json2jsii',
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/joe/schmo.git',
  dependencies: {
    'json-schema': Semver.caret('0.2.5'),
    'camelcase': Semver.caret('6.0.0'),
    'snake-case': Semver.caret('3.0.3')
  },
  devDependencies: {
    '@types/json-schema': Semver.caret('7.0.5'),
    'jsii-srcmak': Semver.caret('0.1.4')
  },
  releaseToNpm: true,
  minNodeVersion: '10.17.0'
});

project.synth();
