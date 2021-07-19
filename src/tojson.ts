import { Code } from './code';

export class toJsonFunction {
  public static nameOf(typeName: string) {
    return `${typeName}$toJson`;
  }

  private readonly fields: Record<string, string> = {};

  public readonly functionName: string;

  constructor(private readonly baseType: string) {
    this.functionName = toJsonFunction.nameOf(this.baseType);
  }

  public addField(schemaName: string, propertyName: string, toJson: toJson) {
    this.fields[schemaName] = toJson(`obj.${propertyName}`);
  }

  public emit(code: Code) {
    code.line();
    code.line('/**');
    code.line(` * Converts an object of type '${this.baseType}' to JSON representation.`);
    code.line(' */');
    code.openBlock(`export function ${this.functionName}(obj: ${this.baseType} | undefined): Record<string, any> | undefined`);
    code.line('if (obj === undefined) { return undefined; }');
    code.open('const result = {');
    for (const [k, v] of Object.entries(this.fields)) {
      code.line(`'${k}': ${v},`);
    }
    code.close('};');

    code.line('// filter undefined values');
    code.line('return Object.entries(result).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: i[1] }), {});');

    code.closeBlock();
  }
}

export type toJson = (x: string) => string;