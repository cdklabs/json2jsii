const { CdklabsTypeScriptProject } = require('cdklabs-projen-project-types');
const { typescript } = require('projen');

const project = new CdklabsTypeScriptProject({
  private: false,
  enablePRAutoMerge: true,
  workflowNodeVersion: '16.x',
  minNodeVersion: '16.14.0',
  name: 'json2jsii',
  description: 'Generates jsii structs from JSON schemas',
  authorName: 'Elad Ben-Israel',
  authorEmail: 'elad.benisrael@gmail.com',
  repository: 'https://github.com/aws/json2jsii.git',
  deps: ['json-schema', 'camelcase', 'snake-case'],
  devDeps: ['@types/json-schema', 'jsii-srcmak', 'prettier', 'cdklabs-projen-project-types'],
  releaseToNpm: true,
  minNodeVersion: '14.17.0',
  projenUpgradeSecret: 'PROJEN_GITHUB_TOKEN',
  defaultReleaseBranch: 'main',
  autoApproveOptions: {
    allowedUsernames: ['cdklabs-automation'],
    secret: 'GITHUB_TOKEN',
  },
  autoApproveUpgrades: true,
});

project.gitignore.exclude('.vscode/');

project.synth();
