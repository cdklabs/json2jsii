import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';

const project = new CdklabsTypeScriptProject({
  private: false,
  enablePRAutoMerge: true,
  workflowNodeVersion: '16.x',
  minNodeVersion: '16.14.0',
  name: 'json2jsii',
  projenrcTs: true,
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/aws/json2jsii.git',
  deps: ['json-schema', 'camelcase', 'snake-case'],
  devDeps: ['@types/json-schema', 'jsii-srcmak', 'prettier', 'cdklabs-projen-project-types'],
  releaseToNpm: true,
  defaultReleaseBranch: 'main',
  autoApproveUpgrades: true,
});

project.gitignore.exclude('.vscode/');

project.synth();
