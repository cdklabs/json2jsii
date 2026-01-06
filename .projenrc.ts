import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';
import { AiAgent, AiInstructions } from 'projen';

const project = new CdklabsTypeScriptProject({
  private: false,
  enablePRAutoMerge: true,
  name: 'json2jsii',
  projenrcTs: true,
  setNodeEngineVersion: false,
  description: 'Generates jsii structs from JSON schemas',
  repository: 'https://github.com/cdklabs/json2jsii',
  deps: ['json-schema', 'camelcase', 'snake-case'],
  devDeps: ['@types/json-schema', 'jsii-srcmak', 'prettier', 'cdklabs-projen-project-types', 'fast-check@^3'],
  releaseToNpm: true,
  defaultReleaseBranch: 'main',
  autoApproveUpgrades: true,
  pullRequestTemplate: true,
  pullRequestTemplateContents: [
    'Fixes #',
    '',
    '---',
    '',
    '### Ask Yourself',
    '',
    '- [ ] Have you reviewed the [contribution guide](https://github.com/cdklabs/json2jsii/blob/main/CONTRIBUTING.md)?',
    '- [ ] Have you reviewed the [breaking changes guide](https://github.com/cdklabs/json2jsii/blob/main/CONTRIBUTING.md#breaking-changes)?',
    '',
  ],
  jestOptions: {
    jestConfig: {
      // Transform fast-check ESM to CommonJS for Jest
      transformIgnorePatterns: [
        'node_modules/(?!(fast-check|pure-rand)/)',
      ],
    },
  },
});

new AiInstructions(project, {
  agents: [AiAgent.KIRO],
});

project.gitignore.exclude('.vscode/');

project.synth();
