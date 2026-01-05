import camelCase from 'camelcase';
import { JSONSchema4 } from 'json-schema';
import { snakeCase } from 'snake-case';
import { NAMED_SYMBOLS } from './allowlist';
import { Code } from './code';
import { ToJsonFunction } from './tojson';
import * as $T from './transformers';

const PRIMITIVE_TYPES = ['string', 'number', 'integer', 'boolean'];
const DEFINITIONS_LEGACY_PREFIX = '#/definitions/';
const DEFINITIONS_PREFIX = '#/$defs/';
const DEFAULT_RENDER_TYPE_NAME = (s: string) => s.split('.').map(x => pascalCase(x)).join('');

/**
 * Available opt-in schema transformations
 */
export interface SchemaTransformations {
  /**
   * When true, unions (anyOf, oneOf, allOf) that contain only a single element are hoisted to the top level of the schema.
   *
   * This transformation runs late in the transformation stack, to ensure maximal effect.
   *
   * ---
   *
   * **Considerations**: A future addition to the union will incur a breaking change in the generated code.
   * Consider if the schema author might have used a union type to convey their future intentions.
   * However the same risk applies for any schema going from a single type to a union type.
   *
   * ----
   *
   * @example { anyOf: [{ type: 'string' }] } -> { type: 'string' }
   *
   * @default false
   */
  readonly hoistSingletonUnions?: boolean;
  /**
   * When true, unions (anyOf, oneOf) that contain a null-type are converted into an optional type with the null-type removed from the union.
   *
   * Combining with `hoistSingletonUnions` can significantly reduce the amount of union types that aren't really unions.
   *
   * ---
   *
   * **Considerations**: Optional properties and `null` values aren't strictly the same in JavaScript.
   * Consider if the difference is functional or if the schema uses this pattern to denoted optional types.
   *
   * ----
   *
   * @example { required: true, anyOf: [{ type: 'null' }, { type: 'string' }] } -> { required: false, anyOf: [{ type: 'string' }] }
   *
   * @default false
   */
  readonly convertNullUnionsToOptional?: boolean;
  /**
   * When true, unions (anyOf, oneOf) that contain an array type and its element type are simplified to just the array type.
   *
   * This is useful for jsii compatibility where such unions would be typed as 'any', but using just the array type
   * provides better type safety while maintaining the same functionality since a single value can be wrapped in an array.
   *
   * ---
   *
   * **Considerations**: This changes the schema's type structure but maintains semantic equivalence since
   * single values can be wrapped in arrays. The transformation assumes that treating a single value as a
   * single-element array is acceptable for the use case.
   *
   * ----
   *
   * @example { anyOf: [{ type: 'array', items: { type: 'string' } }, { type: 'string' }] } -> { type: 'array', items: { type: 'string' } }
   *
   * @default false
   */
  readonly simplifyElementArrayUnions?: boolean;
}

export interface TypeGeneratorOptions {
  /**
   * Patterns of type FQNs to exclude.
   * @default - include all types
   */
  readonly exclude?: string[];

  /**
   * Schema definitions for resolving $refs
   * @default - $refs are not supported
   */
  readonly definitions?: { [def: string]: JSONSchema4 };

  /**
   * Generate `toJson_Xyz` functions for all types which convert data objects
   * back to schema-compatible JSON.
   *
   * These functions are required since property names in generated structs are
   * camel cased in order to be compatible with JSII, and this is a lossy
   * conversion, so the toJson functions are required to convert the data back
   * to a schema-compatible data objects.
   *
   * @default true
   */
  readonly toJson?: boolean;

  /**
   * When true, generated `toJson_Xyz` functions will be marked with as internal.
   * This is useful when you want to hide these functions from public API documentation.
   *
   * @default false
   */
  readonly toJsonInternal?: boolean;

  /**
   * When set to true, enums are sanitized from the 'null' literal value,
   * allowing typing the property as an enum, instead of the underlying type.
   *
   * Note that switching this from 'false' to 'true' is a breaking change in
   * the generated code as it might change a property type.
   *
   * @default false
   */
  readonly sanitizeEnums?: boolean;

  /**
   * Given a definition name, render the type name to be emitted by that definition.
   *
   * When `emitType` is invoked, the type name to be emitted is provided by the caller.
   * However, for complex types containing references to other types, we infer the type name of the reference
   * by looking at the definition name of the `$ref` attribute.
   *
   * This function provides a way to control how those definition names translate into type name.
   *
   * For example, if a complex type references a namespaced definition like `api.group.Foo`, we'd like to control
   * how to translate `api.group.Foo`, which is an illegal typename, into a legal one.
   *
   * @default - Only dot namespacing is handled by default. Elements between dots are pascal cased and concatenated.
   */
  readonly renderTypeName?: (def: string) => string;

  /**
   * Schemas often define a type in ways that make sense for a schema, but may produce convoluted typescript/jsii code.
   * In many cases it is possible to transform these definitions into a semantically identically but simpler version,
   * which will produce "nicer" code.
   *
   * These transformations are often not backwards compatible or at least carry a risk of incurring breaking changes in future.
   * Therefore they are all opt-in.
   *
   * @default - no opt-in transformations are applied
   */
  readonly transformations?: SchemaTransformations;
}

/**
 * Generates typescript types from JSON schemas.
 */
export class TypeGenerator {
  /**
   * Convert all-caps acronyms (e.g. "VPC", "FooBARZooFIGoo") to pascal case
   * (e.g. "Vpc", "FooBarZooFiGoo").
   */
  public static normalizeTypeName(typeName: string) {

    // Handle kebab-case first
    const stage1 = typeName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');

    // start with the full string and then use the regex to match all-caps sequences.
    const re = /([A-Z]+)(?:[^a-z]|$)/g;
    let result = stage1;
    let m;
    do {
      m = re.exec(stage1);
      if (m) {
        const before = result.slice(0, m.index); // all the text before the sequence
        const cap = m[1]; // group #1 matches the all-caps sequence we are after
        const pascal = cap[0] + cap.slice(1).toLowerCase(); // convert to pascal case by lowercasing all but the first char
        const after = result.slice(m.index + pascal.length); // all the text after the sequence
        result = before + pascal + after; // concat
      }
    } while (m);

    result = result.replace(/^./, result[0].toUpperCase()); // ensure first letter is capitalized
    return result;
  }

  /**
   * Renders a JSII struct (and accompanying types) from a JSON schema.
   *
   * If you wish to render multiple top-level structs or include custom types,
   * create a new instance of `TypeGenerator` manually.
   *
   * @param structName The name of the JSII struct (TypeScript interface).
   * @param schema The JSON schema (top level schema must include "properties")
   * @returns Generated TypeScript source code that includes the top-level
   * struct and all other types.
   */
  public static forStruct(structName: string, schema: JSONSchema4, options: TypeGeneratorOptions = {}) {
    const gen = new TypeGenerator({ definitions: { ...schema.definitions, ...schema.$defs }, ...options });
    gen.emitType(structName, schema);
    return gen;
  }

  private readonly typesToEmit: { [name: string]: TypeEmitter } = { };
  private readonly emittedTypes: Record<string, EmittedType> = {};
  private readonly emittedProperties: Set<string> = new Set();
  private readonly exclude: string[];
  private readonly definitions: { [def: string]: JSONSchema4 };
  private readonly toJson: boolean;
  private readonly toJsonInternal: boolean;
  private readonly sanitizeEnums: boolean;
  private readonly renderTypeName: (def: string) => string;
  private readonly transformations: SchemaTransformations;

  /**
   *
   * @param schema Schema definitions
   * @param options
   */
  constructor(options: TypeGeneratorOptions = { }) {
    this.exclude = options.exclude ?? [];
    this.definitions = {};
    this.toJson = options.toJson ?? true;
    this.toJsonInternal = options.toJsonInternal ?? false;
    this.sanitizeEnums = options.sanitizeEnums ?? false;
    this.renderTypeName = options.renderTypeName ?? DEFAULT_RENDER_TYPE_NAME;
    this.transformations = options.transformations ?? {};

    for (const [typeName, def] of Object.entries(options.definitions ?? {})) {
      this.addDefinition(typeName, def);
    }
  }

  /**
   * Adds a JSON schema definition for a type name. This method does not emit the type
   * but rather just registers the definition that will get resolved if this type is `$ref`ed.
   *
   * @param typeName The name of the type.
   * @param def The JSON schema definition for this type
   */
  public addDefinition(typeName: string, def: JSONSchema4) {
    this.definitions[typeName] = def;
  }

  /**
   * Overrides the definition of `fromTypeName` such that any references to it
   * will be resolved as `toTypeName`. Bear in mind that the type name specified
   * in `to` must either be defined as a definition (`addDefinition()`) _or_
   * emitted as a custom type (`emitCustomType()`).
   */
  public addAlias(from: string, to: string) {
    this.addDefinition(from, { $ref: `#/definitions/${to}` });
  }

  /**
   * Emit a type based on a JSON schema. If `def` is not specified, the
   * definition of the type will be looked up in the `definitions` provided
   * during initialization or via `addDefinition()`.
   *
   * @param typeName The name of th type
   * @param def JSON schema. If not specified, the schema is looked up from
   * `definitions` based on the type name
   * @param structFqn FQN for the type (defaults to `typeName`)
   * @returns The resolved type (not always the same as `typeName`)
   */
  public emitType(typeName: string, def?: JSONSchema4, structFqn: string = typeName): string {
    return this.emitTypeInternal(typeName, def, structFqn).type;
  }

  /**
   * Many schemas define a type in ways that make sense for a schema,
   * but cannot easily be represented in jsii.
   * However often it is possible to transform these into a simplified version
   * of the same type, that will have the same semantic meaning in jsii.
   *
   * To avoid having the type generator be aware of all these cases,
   * we transform those types into their corresponding simplified definitions.
   *
   * @param def - the schema to be transformed
   */
  private transformTypes(def: JSONSchema4): JSONSchema4 {
    const transformers: Array<(def: JSONSchema4) => JSONSchema4> = [
      // remove
      $T.reduceNullTypeArray, // legacy mandatory transformation
      this.maybeWith($T.reduceNullFromUnions, this.transformations.convertNullUnionsToOptional),

      // merge
      $T.reduceDuplicateTypesInUnion, // mandatory, as it prevents invalid code

      // change
      this.maybeWith($T.reduceArrayUnions, this.transformations.simplifyElementArrayUnions),

      // needs to run towards the end to have the most effect
      this.maybeWith($T.hoistSingletonUnions, this.transformations.hoistSingletonUnions),
    ];

    const deepCopiedDef = JSON.parse(JSON.stringify(def));
    return transformers.reduce((input, transform) => transform(input), deepCopiedDef);
  }

  /**
   * Helper to conditionally run transformations
   */
  private maybeWith(transformation: (def: JSONSchema4) => JSONSchema4, run: boolean = false) {
    return run ? transformation : (def: JSONSchema4) => def;
  }

  /**
   * Emit a type based on a JSON schema. If `def` is not specified, the
   * definition of the type will be looked up in the `definitions` provided
   * during initialization or via `addDefinition()`.
   *
   * @param typeName The name of th type
   * @param def JSON schema. If not specified, the schema is looked up from
   * `definitions` based on the type name
   * @param structFqn FQN for the type (defaults to `typeName`)
   * @returns The resolved type (not always the same as `typeName`)
   */
  private emitTypeInternal(typeName: string, def?: JSONSchema4, structFqn: string = typeName): EmittedType {
    if (!def) {
      def = this.definitions[typeName];
      if (!def) {
        throw new Error(`unable to find schema definition for ${typeName}`);
      }
    }

    def = this.transformTypes(def);

    if (def.enum && this.sanitizeEnums) {
      // sanitize enums from literal 'null' because they prevent emitting the enum
      // and instead cause a fallback to 'string'. we assume the optionality of the enum
      // covers the 'null' value.
      def.enum = def.enum.filter(d => d !== null);
    }

    // callers expect that emit a type named `typeName` so we can't change it here
    // but at least we can verify it's correct.
    if (TypeGenerator.normalizeTypeName(typeName) !== typeName) {
      throw new Error(`${typeName} must be normalized before calling emitType`);
    }

    if (structFqn.startsWith(DEFINITIONS_LEGACY_PREFIX)) {
      structFqn = structFqn.substring(DEFINITIONS_LEGACY_PREFIX.length);
    } else if (structFqn.startsWith(DEFINITIONS_PREFIX)) {
      structFqn = structFqn.substring(DEFINITIONS_PREFIX.length);
    }

    if (this.isExcluded(structFqn)) {
      throw new Error(`Type ${structFqn} cannot be added since it matches one of the exclusion patterns`);
    }

    // complex type
    if (def.$ref) {
      return this.typeForRef(def);
    }

    // unions (unless this is a struct, and then we just ignore the constraints)
    if (def.oneOf || def.anyOf) {

      const asUnion = this.tryEmitUnion(typeName, def, structFqn);
      if (asUnion) {
        return asUnion;
      }

      // carry on, we can't represent this schema as a union (yet?)
    }

    // dates
    if (def.format === 'date-time') {
      if (def.type && def.type !== 'string') {
        throw new Error('date-time must be a string');
      }

      return { type: 'Date', toJson: x => `${x}?.toISOString()` };
    }

    // enums
    if (def.enum && Array.isArray(def.enum) && def.enum.length > 0 && def.enum.every(x => ['string', 'number'].includes(typeof(x)))) {
      if (def.type && !(def.type === 'string' || def.type === 'number' || def.type === 'integer')) {
        throw new Error('only enums with string or number values are supported');
      }

      return this.emitEnum(typeName, def, structFqn);
    }

    // struct
    if (def.properties) {
      if (def.type && def.type !== 'object') {
        throw new Error('for "properties", if "type" is specified it has to be an "object"');
      }

      return this.emitStruct(typeName, def, structFqn);
    }

    // map
    if (def.additionalProperties && typeof(def.additionalProperties) === 'object') {
      if (def.type && def.type !== 'object') {
        throw new Error('for "additionalProperties", if "type" is specified it has to be an "object"');
      }

      const et = this.typeForProperty(typeName, def.additionalProperties);
      const toJson = (x: string) => `((${x}) === undefined) ? undefined : (Object.entries(${x}).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: ${et.toJson('i[1]') } }), {}))`;
      return { type: `{ [key: string]: ${et.type} }`, toJson };
    }

    switch (def.type) {
      case 'string':
        return { type: 'string', toJson: x => x };

      case 'number':
      case 'integer':
        return { type: 'number', toJson: x => x };

      case 'boolean':
        return { type: 'boolean', toJson: (x) => x };

      case 'array': {
        return this.emitArray(typeName, def);
      }
    }

    return { type: 'any', toJson: x => x };
  }

  /**
   * Registers a custom type and emits it. This will override any existing
   * definitions for this type name.
   *
   * @param typeName The name of the type emitted by this handler.
   * @param emitter A function that will be called to emit the code and returns
   * information about the emitted type.
   */
  public emitCustomType(typeName: string, emitter: TypeEmitter | CodeEmitter) {
    if (typeName in this.emittedTypes) {
      return;
    }

    this.typesToEmit[typeName] = code => {
      const result = emitter(code);
      if (typeof(result) === 'object') {
        return result;
      } else {
        return { type: typeName, toJson: x => x };
      }
    };
  }

  /**
   * @deprecated use `emitCustomType()`
   */
  public addCode(typeName: string, emitter: TypeEmitter | CodeEmitter) {
    return this.emitCustomType(typeName, emitter);
  }

  /**
   * Renders all emitted types to a string.
   *
   * Use `renderToCode()` in order to render output to an existing `Code` object.
   */
  public render(): string {
    const code = new Code();
    this.renderToCode(code);
    return code.render();
  }

  /**
   * Writes all types to a `CodeMaker` with an open file.
   * Use this method in case you need to add those type to an existing file.
   * @param code The `CodeMaker` instance.
   */
  public renderToCode(code: Code) {
    while (Object.keys(this.typesToEmit).length) {
      const name = Object.keys(this.typesToEmit)[0];
      const emitter = this.typesToEmit[name];
      const emittedType = emitter(code);
      code.line();
      delete this.typesToEmit[name];
      this.emittedTypes[name] = emittedType;
    }
  }

  /**
   * @deprecated use `renderToCode()`
   */
  public emitCode(code: Code) {
    return this.renderToCode(code);
  }

  /**
   * @deprecated use `emitType()`
   */
  public addType(typeName: string, def?: JSONSchema4, structFqn: string = typeName) {
    return this.emitType(typeName, def, structFqn);
  }

  /**
   * Emits an array.
   */
  private emitArray(typeName: string, def: JSONSchema4): EmittedType {
    const et = this.typeForArray(typeName, def);
    return { type: `${et.type}[]`, toJson: x => `${x}?.map(y => ${et.toJson('y')})` };
  }

  /**
   * @returns true if this definition can be represented as a union or false if it cannot
   */
  private tryEmitUnion(typeName: string, def: JSONSchema4, fqn: string): EmittedType | undefined {
    const options = new Array<string>();
    for (const option of def.oneOf || def.anyOf || []) {
      // If it's a $ref, resolve it first
      const resolvedOption = option.$ref ? this.resolveReference(option) : option;

      if (!supportedUnionOptionType(resolvedOption.type)) {
        return undefined;
      }

      const type = resolvedOption.type === 'integer' ? 'number' : resolvedOption.type;
      options.push(type);
    }

    const emitted: EmittedType = { type: typeName, toJson: x => `${x}?.value` };

    this.emitCustomType(typeName, code => {
      this.emitDescription(code, fqn, def.description);

      code.openBlock(`export class ${typeName}`);
      const possibleTypes = [];

      for (const type of options) {
        possibleTypes.push(type);
        const methodName = 'from' + type[0].toUpperCase() + type.substring(1);
        code.openBlock(`public static ${methodName}(value: ${type}): ${typeName}`);
        code.line(`return new ${typeName}(value);`);
        code.closeBlock();
      }

      code.openBlock(`private constructor(public readonly value: ${possibleTypes.join(' | ')})`);
      code.closeBlock();

      code.closeBlock();

      return emitted;
    });

    return emitted;
  }

  private emitStruct(typeName: string, structDef: JSONSchema4, structFqn: string): EmittedType {
    const toJson = new ToJsonFunction(typeName, this.toJsonInternal);
    const emitted: EmittedType = {
      type: typeName,
      toJson: x => `${toJson.functionName}(${x})`,
    };

    this.emitCustomType(typeName, code => {

      this.emitDescription(code, structFqn, structDef.description);
      code.openBlock(`export interface ${typeName}`);

      const props = Object.entries(structDef.properties || {});
      for (const [idx, [propName, propSpec]] of props.entries()) {
        this.emitProperty(code, propName, propSpec, structFqn, structDef, toJson);
        if (idx < props.length - 1) {
          code.line();
        }
      }

      code.closeBlock();

      if (this.toJson) {
        toJson.emit(code);
      }

      return emitted;
    });

    return emitted;
  }

  private propertyFqn(structFqn: string, propName: string) {
    return `${structFqn}.${propName}`;
  }

  private emitProperty(code: Code, name: string, propDef: JSONSchema4, structFqn: string, structDef: JSONSchema4, toJson: ToJsonFunction) {
    const originalName = name;

    // if the name starts with '$' (like $ref or $schema), we remove the "$"
    // and it's the same deal - will produce invalid output
    if (name.startsWith('$')) {
      name = name.substring(1);
    }

    // Replace slashes with underscores (for property names liks 'kubernetes/io')
    name = name.replace(/\//, '_');

    // convert the name to camel case so it's compatible with JSII
    name = camelCase(name);

    const propertyFqn = this.propertyFqn(structFqn, name);

    if (this.emittedProperties.has(propertyFqn)) {
      // can happen if two properties have different casing that results
      // in the same camelCase string.
      return;
    }

    this.emitDescription(code, `${structFqn}#${originalName}`, propDef.description);
    const propertyType = this.typeForProperty(`${structFqn}.${name}`, propDef);
    const required = this.isPropertyRequired(originalName, structDef);
    const optional = required ? '' : '?';

    code.line(`readonly ${name}${optional}: ${propertyType.type};`);

    toJson.addField(originalName, name, propertyType.toJson);
    this.emittedProperties.add(propertyFqn);
  }

  private emitEnum(typeName: string, def: JSONSchema4, structFqn: string): EmittedType {
    const emitted: EmittedType = {
      type: typeName,
      toJson: x => x,
    };

    this.emitCustomType(typeName, code => {

      if (!def.enum || def.enum.length === 0) {
        throw new Error(`definition is not an enum: ${JSON.stringify(def)}`);
      }

      if (def.type && !(def.type === 'string' || def.type === 'number' || def.type === 'integer')) {
        throw new Error('only enums with string or number values are supported');
      }

      this.emitDescription(code, structFqn, def.description);

      code.openBlock(`export enum ${typeName}`);

      const processedValues = new Set<string>();

      for (const value of def.enum) {
        if (!['string', 'number'].includes(typeof(value))) {
          throw new Error('only enums with string or number values are supported');
        }

        let memberName = snakeCase(rewriteNamedSymbols(`${value}`).replace(/[^a-z0-9]/gi, '_')).split('_').filter(x => x).join('_').toUpperCase();

        // If enums of same value exists, then we choose one of them and skip adding others
        // since that would cause conflict
        const lowerCaseValue = value?.toString().toLowerCase();
        if (lowerCaseValue && !processedValues.has(lowerCaseValue)) {
          processedValues.add(lowerCaseValue);
        } else {
          continue;
        }

        // if member name starts with a non-alpha character, add a prefix so it becomes a symbol
        if (!/^[A-Z].*/i.test(memberName)) {
          memberName = 'VALUE_' + memberName;
        }

        code.line(`/** ${value} */`);
        code.line(`${memberName} = ${JSON.stringify(value)},`);
      }

      code.closeBlock();

      return emitted;
    });

    return emitted;
  }

  private emitDescription(code: Code, fqn: string, description?: string, annotations: { [type: string]: string } = { }) {
    code.line('/**');

    if (description) {
      description = description.replace(/\*\//g, '_/');

      for (const dline of description.split('\n').map(x => x.trim())) {
        code.line(` * ${dline}`);
      }

      const extractDefault = /Defaults?\W+(to|is)\W+(.+)/g.exec(description);
      const def = extractDefault && extractDefault[2];
      if (def) {
        annotations.default = def;
      }

      code.line(' *');
    }

    annotations.schema = fqn;

    for (const [type, value] of Object.entries(annotations)) {
      code.line(` * @${type} ${value}`);
    }

    code.line(' */');
  }

  private typeForProperty(propertyFqn: string, def: JSONSchema4): EmittedType {
    const subtype = TypeGenerator.normalizeTypeName(DEFAULT_RENDER_TYPE_NAME(propertyFqn));
    return this.emitTypeInternal(subtype, def, subtype);
  }

  private typeForRef(def: JSONSchema4): EmittedType {
    if (!def.$ref || !isDefinitionsRef(def.$ref)) {
      throw new Error(`invalid $ref ${JSON.stringify(def)}`);
    }

    if (this.isExcluded(def.$ref)) {
      return { type: 'any', toJson: x => x };
    }

    const typeName = TypeGenerator.normalizeTypeName(this.renderTypeName(extractDefinitionName(def.$ref)));

    // if we already emitted a type with this type name, just return it
    const emitted = this.emittedTypes[typeName];
    if (emitted) {
      return emitted;
    }

    const schema = this.resolveReference(def);
    return this.emitTypeInternal(typeName, schema, def.$ref);
  }

  private typeForArray(propertyFqn: string, def: JSONSchema4): EmittedType {
    if (!def.items || typeof(def.items) !== 'object') {
      // Falling back to an array of any type
      def.items = {};
    }

    return this.typeForProperty(propertyFqn, def.items);
  }

  private resolveReference(def: JSONSchema4): JSONSchema4 {
    const ref = def.$ref;
    if (!ref || !isDefinitionsRef(ref)) {
      throw new Error('expecting a local reference');
    }

    const lookup = extractDefinitionName(ref);
    const found = this.definitions[lookup];
    if (!found) {
      throw new Error(`unable to find a definition for the $ref "${lookup}"`);
    }

    return found;
  }

  private isPropertyRequired(property: string, structDef: JSONSchema4) {
    return Array.isArray(structDef.required) && structDef.required.includes(property);
  }

  private isExcluded(fqn: string) {
    for (const pattern of this.exclude) {
      const re = new RegExp(pattern);
      if (re.test(fqn)) {
        return true;
      }
    }

    return false;
  }

}

function supportedUnionOptionType(type: any): type is string {
  return type && typeof(type) === 'string' && PRIMITIVE_TYPES.includes(type);
}

function pascalCase(s: string): string {
  return camelCase(s, { pascalCase: true });
}

interface EmittedType {
  /**
   * The JavaScript type to emit.
   */
  readonly type: string;

  /**
   * Returns the code to convert a statement `s` back to JSON.
   */
  readonly toJson: (code: string) => string;
}

function rewriteNamedSymbols(input: string): string {
  const ret = new Array<string>();

  let cursor = 0;
  while (cursor < input.length) {
    const [prefixName, prefixLen] = longestPrefixMatch(input, cursor, NAMED_SYMBOLS);
    if (prefixName) {
      const prefix = `_${prefixName}_`.split('');
      ret.push(...prefix);
      cursor += prefixLen;
    } else {
      ret.push(input.charAt(cursor));
      cursor += 1;
    }
  }

  // Remove underscores if its only prefix to be returned
  if (ret[0] === '_') { ret.unshift('VALUE'); }
  if (ret[ret.length - 1] === '_') { ret.pop(); }

  return ret.join('');
}

function longestPrefixMatch(input: string, index: number, lookupTable: Record<string, string>): [string | undefined, number] {
  let ret: string | undefined;
  let longest: number = 0;

  for (const [name, value] of Object.entries(lookupTable)) {
    if (hasSubStringAt(input, index, value) && value.length > longest && !isExemptPattern(input, index)) {
      ret = name;
      longest = value.length;
    }
  }
  return [ret, longest];
}

function hasSubStringAt(input: string, index: number, substring: string): boolean {
  if (index == input.indexOf(substring, index)) {
    return true;
  }

  return false;
}

function isExemptPattern(input: string, index: number): boolean {
  const exemptPatterns = [
    // 9.9, 9.
    /(?<=\d)\.\d/,
  ];

  return exemptPatterns.some((p) => testRegexAt(p, input, index));
}

function testRegexAt(regex: RegExp, input: string, index: number): boolean {
  const re = new RegExp(regex, 'y');
  re.lastIndex = index;

  return re.test(input);
}

function isDefinitionsRef(ref: string): boolean {
  return ref.startsWith(DEFINITIONS_LEGACY_PREFIX) || ref.startsWith(DEFINITIONS_PREFIX);
}

function extractDefinitionName(ref: string): string {
  if (ref.startsWith(DEFINITIONS_LEGACY_PREFIX)) {
    return ref.substring(DEFINITIONS_LEGACY_PREFIX.length);
  } else if (ref.startsWith(DEFINITIONS_PREFIX)) {
    return ref.substring(DEFINITIONS_PREFIX.length);
  }
  throw new Error(`invalid definitions ref: ${ref}`);
}

type TypeEmitter = (code: Code) => EmittedType;
type CodeEmitter = (code: Code) => void;
