const allowListCharacters = {
  EXCLAMATION: '!',
  AT_SIGN: '@',
  BACKTICK: '`',
  AMPERSAND: '&',
  APOSTROPHE: '\'',
  ASTERISK: '*',
  HYPHEN: '-',
  UNDERSCORE: '_',
  DOLLAR_SIGN: '$',
  POUND_SIGN: '#',
  TILDE: '~',
  PERCENT: '%',
  CARAT: '^',
  PIPE: '|',
  QUESTION_MARK: '?',
  COMMA: ',',
  PERIOD: '.',
  LESS_THAN: '<',
  GREATER_THAN: '>',
  OPEN_BRACKET: '(',
  CLOSE_BRACKET: ')',
  OPEN_BRACE: '{',
  CLOSE_BRACE: '}',
  SEMI_COLON: ';',
  COLON: ':',
  QUOTATION_MARK: '"',
  FORWARD_SLASH: '/',
  BACKWARD_SLASH: '\\',
  NOT_EQUALS_TO: '!=',
  EQUALS_TO: '==',
  DEEP_EQUALS: '===',
  EQUAL_TILDE: '=~',
  NEGATION_TILDE: '!~',
  ROUND_BRACKETS: '()',
  CURLY_BRACES: '{}',
  ANGLE_BRACKETS: '<>',
  GREATER_THAN_EQUAL_TO: '>=',
  LESSER_THAN_EQUAL_TO: '<=',
};

export function isAllowlistedCharacter(char: string): boolean {
  if (Object.values(allowListCharacters).includes(char)) {
    return true;
  }

  return false;
}

export function getAllowlistedCharName(char: string): string | undefined {
  for (const [key, value] of Object.entries(allowListCharacters)) {
    if (value === char) {
      return key;
    }
  }

  return undefined;
}