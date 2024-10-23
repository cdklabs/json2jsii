import { Code } from './code';

export interface ObjectField {
  renderedField: string;
  propertyRegex?: string;
}
export class ToJsonFunction {
  /**
   * The name the toJson function for a struct.
   */
  public readonly functionName: string;

  private readonly fields: Record<string, ObjectField> = {};

  constructor(private readonly baseType: string) {
    this.functionName = `toJson_${baseType}`;
  }

  /**
   * Adds a field to the struct.
   *
   * @param schemaName The name of the property in the schema ("to")
   * @param propertyName The name of the TypeScript property ("from")
   * @param toJson A function used to convert a value from JavaScript to schema
   * format. This could be `x => x` if no conversion is required.
   */
  public addField(schemaName: string, propertyName: string, toJson: ToJson, propertyRegex?: string) {
    this.fields[schemaName]= <ObjectField>{
      renderedField: toJson(`obj.${propertyName}`),
      propertyRegex: propertyRegex,
    };
  }

  public emit(code: Code) {
    code.line();
    code.line('/**');
    code.line(` * Converts an object of type '${this.baseType}' to JSON representation.`);
    code.line(' */');
    code.line('/* eslint-disable max-len, quote-props */');
    code.openBlock(`export function ${this.functionName}(obj: ${this.baseType} | undefined): Record<string, any> | undefined`);
    code.line('if (obj === undefined) { return undefined; }');

    code.open('const result = {');
    for (const [k, v] of Object.entries(this.fields)) {
      code.line(`'${k}': ${v.renderedField},`);
    }
    code.close('};');

    code.line('// filter undefined values');
    code.line('return Object.entries(result).reduce((r, i) => (i[1] === undefined) ? r : ({ ...r, [i[0]]: i[1] }), {});');

    for (const [k, v] of Object.entries(this.fields)) {
      if (v.propertyRegex) {
        code.open(`if (result['${k}'] !== undefined && !(new RegExp('${v.propertyRegex}').test(result['${k}']!))) {`);
        code.line(`throw new Error('property ${k} does not match validation regex ${v.propertyRegex}')`);
        code.close('};');
      }
    };

    code.closeBlock();
    code.line('/* eslint-enable max-len, quote-props */');
  }
}

/**
 * A function that converts an expression from JavaScript to schema format.
 *
 * @example x => x
 * @example x => x?.map(y => toJson_Foo(y))
 */
export type ToJson = (expression: string) => string;
