import { JSONSchema4 } from 'json-schema';
import { TypeGenerator } from '../src';
import { generate } from './util';

jest.setTimeout(3 * 60_000); // 3min

describe('const-to-enum integration', () => {
  describe('oneOf with const values produces TypeScript enum (with hoistSingletonUnions)', () => {
    test('string const values in oneOf produce TypeScript enum', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          indentStyle: {
            oneOf: [
              {
                type: 'string',
                const: 'tab',
                description: 'Use tab characters for indentation',
              },
              {
                type: 'string',
                const: 'space',
                description: 'Use space characters for indentation',
              },
            ],
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * @schema Config#indentStyle
           */
          readonly indentStyle?: ConfigIndentStyle;
        }

        /**
         * @schema ConfigIndentStyle
         */
        export enum ConfigIndentStyle {
          /** Use tab characters for indentation (tab) */
          TAB = \\"tab\\",
          /** Use space characters for indentation (space) */
          SPACE = \\"space\\",
        }
        "
      `);
    });

    test('number const values in oneOf produce TypeScript enum', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          indentSize: {
            oneOf: [
              {
                type: 'number',
                const: 2,
                description: 'Two spaces per indent level',
              },
              {
                type: 'number',
                const: 4,
                description: 'Four spaces per indent level',
              },
              {
                type: 'number',
                const: 8,
                description: 'Eight spaces per indent level',
              },
            ],
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * @schema Config#indentSize
           */
          readonly indentSize?: ConfigIndentSize;
        }

        /**
         * @schema ConfigIndentSize
         */
        export enum ConfigIndentSize {
          /** Two spaces per indent level (2) */
          VALUE_2 = 2,
          /** Four spaces per indent level (4) */
          VALUE_4 = 4,
          /** Eight spaces per indent level (8) */
          VALUE_8 = 8,
        }
        "
      `);
    });
  });

  describe('const produces same output as equivalent enum', () => {
    test('string const values produce same output as single-value enums', async () => {
      // Schema using const (new pattern)
      const constSchema: JSONSchema4 = {
        type: 'object',
        properties: {
          indentStyle: {
            oneOf: [
              { type: 'string', const: 'tab', description: 'Use tabs' },
              { type: 'string', const: 'space', description: 'Use spaces' },
            ],
          },
        },
      };

      // Equivalent schema using enum (existing pattern)
      const enumSchema: JSONSchema4 = {
        type: 'object',
        properties: {
          indentStyle: {
            oneOf: [
              { type: 'string', enum: ['tab'], description: 'Use tabs' },
              { type: 'string', enum: ['space'], description: 'Use spaces' },
            ],
          },
        },
      };

      const constGen = TypeGenerator.forStruct('Config', constSchema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const enumGen = TypeGenerator.forStruct('Config', enumSchema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });

      const constSource = await generate(constGen);
      const enumSource = await generate(enumGen);

      // Both should produce identical output
      expect(constSource).toEqual(enumSource);
    });
  });

  describe('mixed const and enum patterns produce unified TypeScript enum', () => {
    test('oneOf with mixed const and enum produces unified TypeScript enum', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          format: {
            oneOf: [
              { type: 'string', const: 'json', description: 'JSON format' },
              { type: 'string', enum: ['yaml', 'xml'] },
            ],
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * @schema Config#format
           */
          readonly format?: ConfigFormat;
        }

        /**
         * @schema ConfigFormat
         */
        export enum ConfigFormat {
          /** JSON format (json) */
          JSON = \\"json\\",
          /** yaml */
          YAML = \\"yaml\\",
          /** xml */
          XML = \\"xml\\",
        }
        "
      `);
    });

    test('anyOf with mixed const and enum produces unified TypeScript enum', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          level: {
            anyOf: [
              {
                type: 'string',
                const: 'debug',
                description: 'Debug level logging',
              },
              {
                type: 'string',
                const: 'info',
                description: 'Info level logging',
              },
              { type: 'string', enum: ['warn', 'error'] },
            ],
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * @schema Config#level
           */
          readonly level?: ConfigLevel;
        }

        /**
         * @schema ConfigLevel
         */
        export enum ConfigLevel {
          /** Debug level logging (debug) */
          DEBUG = \\"debug\\",
          /** Info level logging (info) */
          INFO = \\"info\\",
          /** warn */
          WARN = \\"warn\\",
          /** error */
          ERROR = \\"error\\",
        }
        "
      `);
    });
  });

  describe('single const without oneOf', () => {
    test('single string const produces literal type', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          version: {
            type: 'string',
            const: 'v1',
            description: 'API version',
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * API version
           *
           * @schema Config#version
           */
          readonly version?: ConfigVersion;
        }

        /**
         * API version
         *
         * @schema ConfigVersion
         */
        export enum ConfigVersion {
          /** v1 */
          V1 = \\"v1\\",
        }
        "
      `);
    });

    test('single number const produces literal type', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          maxRetries: {
            type: 'number',
            const: 3,
            description: 'Maximum retry attempts',
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * Maximum retry attempts
           *
           * @schema Config#maxRetries
           */
          readonly maxRetries?: ConfigMaxRetries;
        }

        /**
         * Maximum retry attempts
         *
         * @schema ConfigMaxRetries
         */
        export enum ConfigMaxRetries {
          /** 3 */
          VALUE_3 = 3,
        }
        "
      `);
    });
  });

  describe('nested const values in complex schemas', () => {
    test('deeply nested const values produce TypeScript enums', async () => {
      const schema: JSONSchema4 = {
        type: 'object',
        properties: {
          editor: {
            type: 'object',
            properties: {
              settings: {
                type: 'object',
                properties: {
                  tabStyle: {
                    oneOf: [
                      {
                        type: 'string',
                        const: 'hard',
                        description: 'Hard tabs (actual tab characters)',
                      },
                      {
                        type: 'string',
                        const: 'soft',
                        description: 'Soft tabs (spaces)',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const gen = TypeGenerator.forStruct('Config', schema, {
        toJson: false,
        transformations: {
          hoistSingletonUnions: true,
          convertConstToEnum: true,
        },
      });
      const source = await generate(gen);

      expect(source).toMatchInlineSnapshot(`
        "/**
         * @schema Config
         */
        export interface Config {
          /**
           * @schema Config#editor
           */
          readonly editor?: ConfigEditor;
        }

        /**
         * @schema ConfigEditor
         */
        export interface ConfigEditor {
          /**
           * @schema ConfigEditor#settings
           */
          readonly settings?: ConfigEditorSettings;
        }

        /**
         * @schema ConfigEditorSettings
         */
        export interface ConfigEditorSettings {
          /**
           * @schema ConfigEditorSettings#tabStyle
           */
          readonly tabStyle?: ConfigEditorSettingsTabStyle;
        }

        /**
         * @schema ConfigEditorSettingsTabStyle
         */
        export enum ConfigEditorSettingsTabStyle {
          /** Hard tabs (actual tab characters) (hard) */
          HARD = \\"hard\\",
          /** Soft tabs (spaces) (soft) */
          SOFT = \\"soft\\",
        }
        "
      `);
    });
  });
});
