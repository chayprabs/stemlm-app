/**
 * Truth table computed from Boolean expressions.
 *
 *   expr:   F = A·B + C'      repeatable; one output column each (grammar in boolexpr.ts)
 *   inputs: A, B, C           optional column order; default is alphabetical (x2 before x10)
 *   show:   minterms          optional: minterms | maxterms | both, printed as Σm(…) / ΠM(…)
 *
 * Every cell is evaluated here; the spec cannot supply one. Rows count up in binary with the first input as
 * the most significant bit, so a row's number is its minterm index. Rows where the first output is 1 are tinted.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specGet, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { BoolSyntaxError, formatExpr, parseBoolSystem, truthColumn, type BoolSystem } from './boolexpr';
import { LINE_PITCH, fail, isClipped, textWidth, wrapText } from './common';

export const TRUTH_MAX_INPUTS = 4;
export const TRUTH_MAX_OUTPUTS = 8;

const MARGIN = 8;
const HEAD_H = 19;
const ROW_H = LINE_PITCH;
const INPUT_PAD = 7;
const OUTPUT_PAD = 9;
const MIN_INPUT_W = 24;
const MIN_OUTPUT_W = 30;
/** A bare expression heads its own column when it is this short; a longer one gets a name and a definition line. */
const HEAD_EXPR_W = 84;
const NOTE_GAP = 7;
const MAX_DEFINITIONS = 3;

export function naturalOrder(names: string[]): string[] {
  return [...names].sort((a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0));
}

/** Column order: the declared inputs, then any variable the expressions use that the declaration left out. */
export function truthVariables(system: BoolSystem): string[] {
  if (!system.declared) return naturalOrder(system.variables);
  return [...system.declared, ...system.variables.filter((name) => !system.declared!.includes(name))];
}

function canonical(name: string, column: boolean[], kind: 'Σm' | 'ΠM'): string {
  const rows = column.flatMap((value, row) => (value === (kind === 'Σm') ? [row] : []));
  return rows.length ? `${name} = ${kind}(${rows.join(', ')})` : `${name} = ${kind === 'Σm' ? 0 : 1}`;
}

export function compileTruth(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const sources = specList(spec, 'expr');
  const inputs = specGet(spec, 'inputs');
  const show = (specGet(spec, 'show') ?? '').toLowerCase();
  if (!sources.length) return fail('truth needs an expr line');
  if (show && !/min|max|both|canonical/.test(show)) return fail(`truth show: ${show} is not minterms, maxterms or both`);

  let system: BoolSystem;
  try {
    system = parseBoolSystem(sources, inputs);
  } catch (error) {
    if (error instanceof BoolSyntaxError) return fail(`truth: ${error.message}`);
    throw error;
  }
  const variables = truthVariables(system);
  if (!variables.length) return fail('truth needs at least one input variable');
  if (variables.length > TRUTH_MAX_INPUTS) {
    return fail(`a truth table of ${variables.length} inputs has ${2 ** variables.length} rows; at most ${TRUTH_MAX_INPUTS} inputs (${2 ** TRUTH_MAX_INPUTS} rows) are drawn`, 'refused');
  }
  if (system.outputs.length > TRUTH_MAX_OUTPUTS) return fail(`truth draws at most ${TRUTH_MAX_OUTPUTS} output columns; this one has ${system.outputs.length}`, 'refused');

  // A named output is headed by its name. A bare expression heads its own column when short, else it is named.
  const taken = new Set([...variables, ...system.outputs.flatMap((output) => (output.name ? [output.name] : []))]);
  const letter = ['F', 'Y', 'Z', 'Q'].find((candidate) => ![...taken].some((name) => name.replace(/\d+$/, '') === candidate)) ?? 'out';
  const anonymous = system.outputs.filter((output) => !output.name && textWidth(formatExpr(output.expr)) > HEAD_EXPR_W).length;
  let numbered = 0;
  const outputs = system.outputs.map((output) => {
    const text = formatExpr(output.expr);
    const named = output.name !== null || textWidth(text) > HEAD_EXPR_W;
    const head = output.name ?? (named ? (anonymous > 1 ? `${letter}${++numbered}` : letter) : text);
    return { head, text, named, column: truthColumn(output.expr, variables) };
  });

  const rows = 2 ** variables.length;
  const inputW = variables.map((name) => Math.max(MIN_INPUT_W, textWidth(name) + 2 * INPUT_PAD));
  const outputW = outputs.map((output) => Math.max(MIN_OUTPUT_W, textWidth(output.head) + 2 * OUTPUT_PAD));
  const widths = [...inputW, ...outputW];
  const tableW = widths.reduce((sum, width) => sum + width, 0);
  const nominal = frameSize(ctx.profile);
  if (tableW + 2 * MARGIN > nominal.w * 1.5) return fail('truth table columns are too wide to draw legibly', 'refused');
  const width = Math.max(nominal.w, tableW + 2 * MARGIN);

  const wantSum = /min|both|canonical/.test(show);
  const wantProduct = /max|both|canonical/.test(show);
  const notes: string[][] = [];
  if (show) {
    for (const output of outputs) {
      if (wantSum) notes.push(wrapText(canonical(output.head, output.column, 'Σm'), width - 2 * MARGIN, 2));
      if (wantProduct) notes.push(wrapText(canonical(output.head, output.column, 'ΠM'), width - 2 * MARGIN, 2));
    }
  } else if (outputs.filter((output) => output.named).length <= MAX_DEFINITIONS) {
    for (const output of outputs) {
      if (!output.named) continue;
      // A formula is printed whole or not at all.
      const lines = wrapText(`${output.head} = ${output.text}`, width - 2 * MARGIN, 2);
      if (!isClipped(lines)) notes.push(lines);
    }
  }
  const noteLines = notes.flat();
  const tableH = HEAD_H + rows * ROW_H;
  const contentH = tableH + (noteLines.length ? NOTE_GAP + noteLines.length * LINE_PITCH : 0);
  const b = new SceneBuilder('truth', width, Math.max(contentH + 2 * MARGIN, Math.min(nominal.h, 96)));
  const x0 = (width - tableW) / 2;
  const y0 = (b.height - contentH) / 2;
  const bodyTop = y0 + HEAD_H;
  const lefts = widths.map((_, column) => x0 + widths.slice(0, column).reduce((sum, w) => sum + w, 0));
  const dividerX = x0 + inputW.reduce((sum, w) => sum + w, 0);

  // Tints lie under the rules and the digits.
  outputs[0]!.column.forEach((value, row) => {
    if (value) b.rect(`truth-row-${row}`, x0, bodyTop + row * ROW_H, tableW, ROW_H, { color: 'accent', fill: 'tint', width: 0, role: 'annotation' });
  });
  b.line('truth-rule-top', x0, y0, x0 + tableW, y0, { width: 1.4, role: 'boundary' });
  b.line('truth-rule-head', x0, bodyTop, x0 + tableW, bodyTop, { width: 1.4, role: 'boundary' });
  b.line('truth-rule-bottom', x0, y0 + tableH, x0 + tableW, y0 + tableH, { width: 1.4, role: 'boundary' });
  b.line('truth-divider', dividerX, y0, dividerX, y0 + tableH, { color: 'muted', width: 1, role: 'boundary' });

  [...variables, ...outputs.map((output) => output.head)].forEach((head, column) => {
    b.label(`truth-head-${column}`, head, lefts[column]! + widths[column]! / 2, y0 + HEAD_H / 2, { protected: true });
  });
  for (let row = 0; row < rows; row++) {
    const y = bodyTop + (row + 0.5) * ROW_H;
    variables.forEach((_, column) => {
      const bit = (row >> (variables.length - 1 - column)) & 1;
      b.label(`truth-cell-${row}-${column}`, String(bit), lefts[column]! + widths[column]! / 2, y, { protected: true });
    });
    outputs.forEach((output, index) => {
      const column = variables.length + index;
      b.label(`truth-cell-${row}-${column}`, output.column[row] ? '1' : '0', lefts[column]! + widths[column]! / 2, y, { protected: true });
    });
  }
  noteLines.forEach((line, index) => {
    b.label(`truth-note-${index}`, line, width / 2, y0 + tableH + NOTE_GAP + (index + 0.5) * LINE_PITCH, { protected: true });
  });
  return layoutAndCompile(b.scene());
}
