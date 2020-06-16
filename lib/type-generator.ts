import { JSONSchema4 } from 'json-schema';
import { CodeMaker, toPascalCase } from 'codemaker';
import * as path from 'path';

const PRIMITIVE_TYPES = [ 'string', 'number', 'integer', 'boolean' ];
const DEFINITIONS_PREFIX = '#/definitions/';

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
}

/**
 * Generates typescript types from JSON schemas.
 */
export class TypeGenerator {
  private readonly typesToEmit: { [name: string]: (code: CodeMaker) => void } = { };
  private readonly emittedTypes = new Set<string>();
  private readonly exclude: string[];
  private readonly definitions: { [def: string]: JSONSchema4 };

  /**
   *
   * @param schema Schema definitions
   * @param options
   */
  constructor(options: TypeGeneratorOptions = { }) {
    this.exclude = options.exclude ?? [];
    this.definitions = options.definitions ?? { };
  }

  /**
   * Emit a type based on a JSON schema.
   * @param typeName The name of th type
   * @param def JSON schema
   * @param structFqn FQN for the type (defaults to `typeName`)
   */
  public emitType(typeName: string, def: JSONSchema4, structFqn: string = typeName): string {
    // callers expect that emit a type named `typeName` so we can't change it here
    // but at least we can verify it's correct.
    if (normalizeTypeName(typeName) !== typeName) {
      throw new Error(`${typeName} must be normalized before calling emitType`);
    }

    if (structFqn.startsWith(DEFINITIONS_PREFIX)) {
      structFqn = structFqn.substring(DEFINITIONS_PREFIX.length);
    }

    if (this.isExcluded(structFqn)) {
      throw new Error(`Type ${structFqn} cannot be added since it matches one of the exclusion patterns`);
    }

    if (def.$ref) {
      return this.typeForRef(def);
    }

    // unions (unless this is a struct, and then we just ignore the constraints)
    if (def.oneOf || def.anyOf) {
      if (this.emitUnion(typeName, def, structFqn)) {
        return typeName;
      }

      // carry on, we can't represent this schema as a union (yet?)
    }

    if (def.type === 'string' && def.format === 'date-time') {
      return 'Date';
    }
  
    switch (def.type) {
      case 'boolean': return 'boolean';
      case 'array': return `${this.typeForArray(typeName, def)}[]`;
      case 'any': return 'any';
      case 'null': return 'any';
    }

    if (def.type === 'number' || def.type === 'integer') {
      return 'number';
    }

    if (def.type === 'string') {
      if (def.format === 'date-time') {
        return 'Date';
      }

      if (Array.isArray(def.enum) && def.enum.length > 0 && !def.enum.find(x => typeof(x) !== 'string')) {
        return this.emitEnum(typeName, def, structFqn);
      }

      return 'string';
    }
    
    // map
    if (!def.properties && def.additionalProperties && typeof(def.additionalProperties) === 'object') {
      return `{ [key: string]: ${this.typeForProperty(typeName, def.additionalProperties)} }`;
    }

    // struct
    if (def.properties) {
      this.emitStruct(typeName, def, structFqn)
      return typeName;
    }

    return 'any';
  }

  /**
   * Generates a file with all the types added to this generator.
   *
   * @param filePath The output file path, must have a ".ts" extension.
   */
  public async writeToFile(filePath: string) {
    if (path.extname(filePath) !== '.ts') {
      throw new Error('file must have a .ts extension');
    }

    const code = new CodeMaker();
    const filename = path.basename(filePath);
    code.openFile(filename);
    this.writeToCodeMaker(code);
    code.closeFile(filename);
    await code.save(path.dirname(filePath));
  }

  /**
   * Writes all types to a `CodeMaker` with an open file.
   * Use this method in case you need to add those type to an existing file.
   * @param code The `CodeMaker` instance.
   */
  public writeToCodeMaker(code: CodeMaker) {
    while (Object.keys(this.typesToEmit).length) {
      const name = Object.keys(this.typesToEmit)[0];
      const emitter = this.typesToEmit[name];
      emitter(code);
      code.line();
      delete this.typesToEmit[name];
      this.emittedTypes.add(name);
    }    
  }

  private emitLater(typeName: string, codeEmitter: (code: CodeMaker) => void) {
    if (this.emittedTypes.has(typeName)) {
      return;
    }

    this.typesToEmit[typeName] = codeEmitter;
  }

  /**
   * @returns true if this definition can be represented as a union or false if it cannot
   */
  private emitUnion(typeName: string, def: JSONSchema4, fqn: string) {
    const options = new Array<string>();
    for (const option of def.oneOf || def.anyOf || []) {
      if (!supportedUnionOptionType(option.type)) {
        return false;
      }

      const type = option.type === 'integer' ? 'number' : option.type;
      options.push(type);
    }

    this.emitLater(typeName, code => {
      this.emitDescription(code, fqn, def.description);

      code.openBlock(`export class ${typeName}`);

      for (const type of options) {
        const methodName = 'from' + type[0].toUpperCase() + type.substr(1);
        code.openBlock(`public static ${methodName}(value: ${type}): ${typeName}`);
        code.line(`return new ${typeName}(value);`);
        code.closeBlock();
      }

      code.openBlock('private constructor(value: any)');
      code.line('Object.defineProperty(this, \'resolve\', { value: () => value });');
      code.closeBlock();

      code.closeBlock();
    });

    return true;
  }

  private emitStruct(typeName: string, structDef: JSONSchema4, structFqn: string) {
    this.emitLater(typeName, code => {
      this.emitDescription(code, structFqn, structDef.description);
      code.openBlock(`export interface ${typeName}`);

      for (const [ propName, propSpec ] of Object.entries(structDef.properties || {})) {
  
        if (propName.startsWith('x-')) {
          continue; // skip extensions for now
        }

        if (propName.includes('_')) {
          console.error(`warning: property ${structFqn}.${propName} omitted since it includes an underscore`);
          continue; // skip 
        }
  
        this.emitProperty(code, propName, propSpec, structFqn, structDef);
      }
    
      code.closeBlock();
    });
  }

  private emitProperty(code: CodeMaker, name: string, propDef: JSONSchema4, structFqn: string, structDef: JSONSchema4) {
    const originalName = name;

    // if name is not camelCase, convert it to camel case, but this is likely to
    // produce invalid output during synthesis, so add some annotation to the docs.
    if (name[0] === name[0].toUpperCase()) {
      name = code.toCamelCase(name);
    }

    // if the name starts with '$' (like $ref or $schema), we remove the "$"
    // and it's the same deal - will produce invalid output
    if (name.startsWith('$')) {
      name = name.substring(1);
    }

    this.emitDescription(code, `${structFqn}#${originalName}`, propDef.description);
    const propertyType = this.typeForProperty(`${structFqn}.${name}`, propDef);
    const required = this.isPropertyRequired(name, structDef);
    const optional = required ? '' : '?';

    code.line(`readonly ${name}${optional}: ${propertyType};`);
    code.line();
  }

  private emitEnum(typeName: string, def: JSONSchema4, structFqn: string) {

    this.emitLater(typeName, code => {

      if (!def.enum || def.enum.length === 0) {
        throw new Error(`definition is not an enum: ${JSON.stringify(def)}`);
      }

      if (def.type !== 'string') {
        throw new Error('can only generate string enums');
      }

      this.emitDescription(code, structFqn, def.description);

      code.openBlock(`export enum ${typeName}`);

      for (const value of def.enum) {
        if (typeof(value) !== 'string') {
          throw new Error('can only generate enums for string values');
        }

        // sluggify and turn to UPPER_SNAKE_CASE
        const memberName = code.toSnakeCase(value.replace(/[^a-z0-9]/gi, '_')).split('_').filter(x => x).join('_').toUpperCase();

        code.line(`/** ${value} */`);
        code.line(`${memberName} = "${value}",`);
      }

      code.closeBlock();
    });

    return typeName;
  }

  private emitDescription(code: CodeMaker, fqn: string, description?: string, annotations: { [type: string]: string } = { }) {
    code.line('/**');

    if (description) {
      description = description.replace(/\*\//g, '_/');

      const extractDefault = /Defaults?\W+(to|is)\W+(.+)/g.exec(description);
      const def = extractDefault && extractDefault[2];
    
      code.line(` * ${description}`);
      if (def) {
        annotations['default'] = def;
      }

      code.line(' *');
    }

    annotations['schema'] = fqn;

    for (const [ type, value ] of Object.entries(annotations)) {
      code.line(` * @${type} ${value}`);
    }

    code.line(' */')
  }

  private typeForProperty(propertyFqn: string, def: JSONSchema4): string {
    const subtype = normalizeTypeName(propertyFqn.split('.').map(x => toPascalCase(x)).join(''));
    return this.emitType(subtype, def, subtype);
  }

  private typeForRef(def: JSONSchema4): string {
    const prefix = '#/definitions/';
    if (!def.$ref || !def.$ref.startsWith(prefix)) {
      throw new Error(`invalid $ref ${JSON.stringify(def)}`);
    }

    if (this.isExcluded(def.$ref)) {
      return 'any';
    }

    const comps = def.$ref.substring(prefix.length).split('.');
    const typeName = normalizeTypeName(comps[comps.length - 1]);
    const schema = this.resolveReference(def);
    return this.emitType(typeName, schema, def.$ref);
  }

  private typeForArray(propertyFqn: string, def: JSONSchema4): string {
    if (!def.items || typeof(def.items) !== 'object') {
      throw new Error(`unsupported array type ${def.items}`);
    }

    return this.typeForProperty(propertyFqn, def.items);
  }  

  private resolveReference(def: JSONSchema4): JSONSchema4 {
    const ref = def.$ref;
    if (!ref || !ref.startsWith(DEFINITIONS_PREFIX)) {
      throw new Error('expecting a local reference');
    }

    const lookup = ref.substr(DEFINITIONS_PREFIX.length);
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

/**
 * Convert all-caps acronyms (e.g. "VPC", "FooBARZooFIGoo") to pascal case (e.g. "Vpc", "FooBarZooFiGoo").
 *
 * @internal exported for tests
 */
export function normalizeTypeName(typeName: string) {
  // start with the full string and then use the regex to match all-caps sequences.
  const re = /([A-Z]+)(?:[^a-z]|$)/g;
  let result = typeName;
  let m;
  do {
    m = re.exec(typeName);
    if (m) {
      const before = result.slice(0, m.index); // all the text before the sequence
      const cap = m[1]; // group #1 matches the all-caps sequence we are after
      const pascal = cap[0] + cap.slice(1).toLowerCase(); // convert to pascal case by lowercasing all but the first char
      const after = result.slice(m.index + pascal.length); // all the text after the sequence
      result = before + pascal + after; // concat
    }
  } while (m);

  return result;
}

function supportedUnionOptionType(type: any): type is string {
  return type && (typeof(type) === 'string' && PRIMITIVE_TYPES.includes(type));
}
