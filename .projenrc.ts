import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';

const project = new CdklabsTypeScriptProject({
  private: false,
  enablePRAutoMerge: true,
  name: 'json2jsii',
  projenrcTs: true,
  setNodeEngineVersion: false,
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/cdklabs/json2jsii',
  deps: ['json-schema', 'camelcase', 'snake-case'],
  devDeps: ['@types/json-schema', 'jsii-srcmak', 'prettier', 'cdklabs-projen-project-types'],
  releaseToNpm: true,
  defaultReleaseBranch: 'main',
  autoApproveUpgrades: true,
});

project.gitignore.exclude('.vscode/');

project.synth();
