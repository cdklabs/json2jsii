export class Code {
  public readonly lines = new Array<string>();
  private indent = 0;

  public open(text: string = '') {
    this.line(text);
    this.indent += 2;
  }

  public close(text: string = '') {
    this.indent -= 2;
    this.line(text);
  }

  public openBlock(text: string) {
    this.open(`${text} {`);
  }

  public closeBlock() {
    this.close('}');
  }

  public line(text: string = ''): void {
    const line = ' '.repeat(this.indent) + text;
    this.lines.push(line);
  }

  public render(): string {
    return this.lines.join('\n');
  }
}