import { describe, expect, it } from 'vitest';
import { Refusal } from './native';
import { isPipeTable, translateMarkdownTable } from './mdtable';

const spec = (source: string) => translateMarkdownTable(source).content;
const reason = (source: string): string => {
  try {
    translateMarkdownTable(source);
  } catch (error) {
    if (error instanceof Refusal) return error.reason;
    throw error;
  }
  return 'translated';
};
const table = (...rows: string[]) => rows.join('\n');

describe('isPipeTable', () => {
  it('needs a delimiter row or a closed grid', () => {
    expect(isPipeTable(table('a | b', '--- | ---', '1 | 2'))).toBe(true);
    expect(isPipeTable(table('| 1 | 2 |', '| 3 | 4 |'))).toBe(true);
    expect(isPipeTable(table('a | b', 'c | d'))).toBe(false);
    expect(isPipeTable('| a | b |')).toBe(false);
    expect(isPipeTable(table('text', '| a | b |', '|---|---|'))).toBe(false);
    expect(isPipeTable('if (a || b) return;\nx = a | b;')).toBe(false);
  });
});

describe('Markdown tables', () => {
  it('pads a short row with blank cells only', () => {
    expect(spec(table('| a | b | c |', '|---|---|---|', '| 1 |', '| 1 | 2 | 3 |'))).toBe('kind: matrix\nheaders: a, b, c\nrow: 1, ,\nrow: 1, 2, 3');
  });

  it('keeps math verbatim and strips emphasis only where it is certainly emphasis', () => {
    expect(spec(table('| x | y |', '|---|---|', '| $a_1 * b_2$ | **bold** and _it_ |', '| a*b*c | my_var_name |', '| 5 * 3 * 2 | $5 and $10 |'))).toBe(
      'kind: matrix\nheaders: x, y\nrow: $a_1 * b_2$, bold and it\nrow: a*b*c, my_var_name\nrow: 5 * 3 * 2, $5 and $10',
    );
  });

  it('writes semicolon rows when cells hold commas, and refuses when neither form can hold the cells', () => {
    expect(spec(table('| p | q |', '|---|---|', '| (1, 2) | 3 |'))).toBe('kind: matrix\nheaders: p; q\nrow: (1, 2); 3');
    expect(reason(table('| p, q | r |', '|---|---|', '| 1 | 2 |'))).toMatch(/cells with commas/);
    expect(reason(table('| 1, 2 | 3 |', '| 4 | 5 |'))).toMatch(/cells with commas/);
    expect(reason(table('| only |', '|---|', '| a; b |'))).toMatch(/one-column table/);
    expect(reason(table('| only |', '|---|', '| |'))).toMatch(/one-column table/);
  });

  it('refuses a pipe it cannot place', () => {
    expect(reason(table('| a | b |', '|---|---|', '| $\\|v\\|$ | norm |'))).toBe('a pipe inside math is ambiguous in a table cell');
    expect(reason(table('| a | b |', '|---|---|', '| x \\| y | or |'))).toMatch(/literal pipe/);
  });

  it('refuses tables that are not exactly a table', () => {
    expect(reason(table('| a | b |', '|---|---|'))).toBe('the table has no body rows');
    expect(reason(table('| a | b |', '|---|', '| 1 | 2 |'))).toBe('the delimiter row does not match the header');
    expect(reason(table('| a | b |', '|---|---|', '| 1 | 2 |', '|---|---|'))).toBe('a delimiter row is out of place');
    expect(reason(table('| 1 | 2 |', '| 3 |'))).toBe('a grid without a header must be rectangular');
    expect(reason(table('| a | b |', '|---|---|', '| ![x](y.png) | 2 |'))).toBe('an image has no plain-text form');
    expect(reason(table('a | b', 'c | d'))).toBe('the table has no delimiter row');
  });
});
