const { TypeScriptLibraryProject, Semver } = require('projen');

const project = new TypeScriptLibraryProject({
  name: 'json2jsii',
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/aws/json2jsii.git',
  deps: [
    'json-schema@^0.2.5',
    'camelcase@^6.0.0',
    'snake-case@^3.0.3',
  ],
  devDeps: [
    '@types/json-schema@^7.0.5',
    'jsii-srcmak@^0.1.24',
    'prettier@^2.0.5',
  ],
  releaseToNpm: true,
  minNodeVersion: '10.17.0',
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
});

project.synth();
