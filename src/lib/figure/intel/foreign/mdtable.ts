/**
 * Markdown pipe tables -> `type=table`, `kind: matrix`.
 *
 * Cells keep their text: inline formatting markers go, `$math$` stays verbatim. The table engine
 * splits a row on commas or (consistently) on semicolons and refuses pipes, so a table whose cells
 * cannot be written in either form is refused rather than re-punctuated.
 */
import { MAX_LABEL_CHARS, labelText, refuse, specText, type Translation } from './native';
import { decodeEntities, flattenHtml, splitMath, stripProse } from './text';

const MAX_ROWS = 200;
const MAX_COLUMNS = 24;
const DELIMITER_CELL = /^:?-+:?$/;

function tableLines(source: string): string[] {
  let text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  if (text.startsWith('```')) {
    const firstBreak = text.indexOf('\n');
    text = firstBreak < 0 ? '' : text.slice(firstBreak + 1).replace(/```$/, '').trim();
  }
  return text.split('\n').map((line) => line.trim());
}

function isDelimiterRow(line: string): boolean {
  const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell));
}

/** Cheap shape check: only pipe rows, and either a delimiter row second or a grid of at least two rows. Never throws. */
export function isPipeTable(source: string): boolean {
  if (typeof source !== 'string' || !source.includes('|')) return false;
  const lines = tableLines(source.slice(0, 20_000));
  if (lines.length < 2 || lines.some((line) => !line.includes('|'))) return false;
  return isDelimiterRow(lines[1]!) || lines.every((line) => line.startsWith('|') && line.endsWith('|') && line.length > 2);
}

/** Split a row on pipes. `\|` is a literal pipe, and a pipe inside a `$math$` span belongs to the math. */
function splitRow(line: string): string[] {
  const cells = [''];
  for (const segment of splitMath(line)) {
    if (segment.math) {
      cells[cells.length - 1] += segment.text;
      continue;
    }
    for (let i = 0; i < segment.text.length; i++) {
      const ch = segment.text[i]!;
      if (ch === '\\' && segment.text[i + 1] === '|') cells[cells.length - 1] += segment.text[++i]!;
      else if (ch === '|') cells.push('');
      else cells[cells.length - 1] += ch;
    }
  }
  if (line.startsWith('|')) cells.shift();
  if (cells.length && /(?<!\\)\|$/.test(line) && !cells[cells.length - 1]!.trim()) cells.pop();
  return cells;
}

function cellText(raw: string): string {
  if (raw.length > 4 * MAX_LABEL_CHARS) refuse('a cell is too long to draw');
  const text = splitMath(raw.trim()).map((segment) => {
    if (!segment.math) return decodeEntities(flattenHtml(stripProse(segment.text)));
    if (!segment.text.includes('|')) return segment.text;
    // `\|` would be a norm bar in TeX but an escaped pipe in a table: there is no telling which was meant.
    if (/\\\||\\begin\{/.test(segment.text)) refuse('a pipe inside math is ambiguous in a table cell');
    return segment.text.replace(/\|(?=[A-Za-z])/g, '\\vert ').replace(/\|/g, '\\vert');
  }).join('');
  const cell = labelText(text);
  if (cell.includes('|')) refuse('a cell holds a literal pipe, which the table engine refuses');
  return cell;
}

/** Translate a Markdown pipe table. Throws `Refusal`. */
export function translateMarkdownTable(source: string): Translation {
  const lines = tableLines(source);
  if (lines.length < 2 || lines.length > MAX_ROWS + 2) refuse('not a table of a drawable size');
  if (lines.some((line) => !line.includes('|'))) refuse('a line is not a table row');
  const hasHeader = isDelimiterRow(lines[1]!);
  if (!hasHeader && !lines.every((line) => line.startsWith('|') && line.endsWith('|'))) refuse('the table has no delimiter row');
  if (lines.some((line, index) => index !== 1 && isDelimiterRow(line))) refuse('a delimiter row is out of place');
  const rows = lines.filter((_, index) => !(hasHeader && index === 1)).map((line) => splitRow(line).map(cellText));
  const columns = hasHeader ? rows[0]!.length : Math.max(...rows.map((row) => row.length));
  if (columns < 1 || columns > MAX_COLUMNS) refuse('not a table of a drawable size');
  if (hasHeader && splitRow(lines[1]!).length !== columns) refuse('the delimiter row does not match the header');
  if (!hasHeader && (columns < 2 || rows.some((row) => row.length !== columns))) refuse('a grid without a header must be rectangular');
  // A long row would lose cells and a short one is padded: only blank cells are ever added.
  if (rows.some((row) => row.length > columns)) refuse('a row has more cells than the header');
  const grid = rows.map((row) => [...row, ...Array.from({ length: columns - row.length }, () => '')]);
  if (hasHeader && grid.length < 2) refuse('the table has no body rows');

  const cells = grid.flat();
  const commas = cells.some((cell) => cell.includes(','));
  const semicolons = cells.some((cell) => cell.includes(';'));
  let separator = ', ';
  if (commas) {
    // Semicolon rows need a semicolon-delimited header line without commas, so at least two header cells.
    if (!hasHeader || columns < 2 || semicolons || grid[0]!.some((cell) => cell.includes(','))) refuse('cells with commas cannot be written as a native row here');
    separator = '; ';
  } else if (columns === 1 && (semicolons || cells.some((cell) => !cell))) {
    refuse('a one-column table with blank or semicolon cells cannot be written natively');
  }
  const body = hasHeader ? grid.slice(1) : grid;
  return {
    type: 'table',
    content: specText(['kind: matrix', ...(hasHeader ? [`headers: ${grid[0]!.join(separator)}`] : []), ...body.map((row) => `row: ${row.join(separator)}`)].map((line) => line.trimEnd())),
    notes: [],
  };
}
