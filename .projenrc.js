const { TypeScriptLibraryProject, Semver } = require('projen');

const project = new TypeScriptLibraryProject({
  name: 'json2jsii',
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/aws/json2jsii.git',
  deps: ['json-schema', 'camelcase', 'snake-case'],
  devDeps: ['@types/json-schema', 'jsii-srcmak', 'prettier'],
  releaseToNpm: true,
  minNodeVersion: '10.17.0',
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
  defaultReleaseBranch: 'main',  
});

project.synth();
