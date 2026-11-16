/**
 * Shared types of the figure spec repair layer.
 *
 * The layer rewrites notation only: every repair maps one spelling of a declaration onto the
 * spelling the strict compiler reads. It never adds, removes or changes what a figure says.
 */
import type { Diagram } from '@/src/protocol/types';

/** What was normalised. Codes are stable and machine-readable; `from`/`to` are diagnostics, never UI copy. */
export type RepairCode =
  /** Code fence, `@diagram` / `@enddiagram` marker, or a rule line wrapped around the spec. */
  | 'envelope.wrapper'
  /** HTML entities, zero-width and non-breaking characters, tab indentation, Windows newlines. */
  | 'envelope.characters'
  /** `- key: value`, `* key: value`, `1. key: value`. */
  | 'envelope.bullet'
  /** `**key**:`, `` `key`: ``, `"key":`. */
  | 'envelope.emphasis'
  /** `key = value`, `key -> value`, `key value`. */
  | 'envelope.separator'
  /** Trailing `,` or `;` after a declaration. */
  | 'envelope.trailing'
  /** A line that only restates the family (`type: plot`), repeats the previous scalar line, or is presentation-only (`color: blue`). */
  | 'envelope.redundant'
  /** A JSON object or array rewritten as `key: value` lines. */
  | 'structure.json'
  /** YAML-style nesting rewritten as `key: value` lines. */
  | 'structure.yaml'
  /** A list written where repeated keys are read, or the reverse; list items re-indented. */
  | 'structure.list'
  /** A Markdown pipe table rewritten as table rows. */
  | 'structure.table'
  /** Mermaid / arrow syntax rewritten as node and edge records. */
  | 'structure.arrows'
  /** The type token is a known synonym or separator variant of a family. */
  | 'type.alias'
  /** The type token is a misspelling of a family. */
  | 'type.fuzzy'
  /** No usable type token; exactly one family reads the declared keys. */
  | 'type.inferred'
  /** A `kind` implied by the type token (`type=fbd`) was added. */
  | 'kind.added'
  /** `kind` was a synonym or misspelling of a variant. */
  | 'kind.alias'
  /** `kind` was missing or unreadable; exactly one variant reads the declared keys. */
  | 'kind.inferred'
  /** A synonym of a key (`function` for `fn`). */
  | 'key.alias'
  /** Case or separator variant of a key (`xLabel`, `x-label`). */
  | 'key.format'
  /** A misspelt key (`domian`). */
  | 'key.fuzzy'
  /** Several keys that together spell one (`xmin` + `xmax`, `x` + `y` columns). */
  | 'key.merged'
  /** A range in another notation (`-3 to 3`, `[-3, 3]`). */
  | 'value.range'
  /** An expression in another notation (`2x`, `x²`, LaTeX). */
  | 'value.expr'
  /** The variable every function is written in, declared as `var`. */
  | 'value.var'
  /** A number in another notation (unicode minus, decimal comma). */
  | 'value.number'
  /** A synonym of an enumerated value (`left-to-right` for `LR`). */
  | 'value.enum'
  /** A record in another notation (`A -> B: 4`, `F = 10 N, upward`). */
  | 'value.record'
  /** A list in another notation (`[A, B]`, coordinate tuples, `a | b | c`). */
  | 'value.list';

export interface Repair {
  code: RepairCode;
  from: string;
  to: string;
}

export interface RepairResult {
  diagram: Diagram;
  repairs: Repair[];
}

/** A value as a model may have written it: a string, or structure from JSON / YAML-style nesting. */
export type Loose = string | number | boolean | null | Loose[] | { [key: string]: Loose };

/** How an item's value was written in the source. */
export type ItemForm = 'inline' | 'list' | 'block' | 'json';

/**
 * One source declaration. `lines` is what the item currently renders as; a repair replaces it.
 * An item without a key is a line the tolerant reader could not classify: it is carried through
 * untouched so the strict compiler still refuses the figure.
 */
export interface Item {
  key?: string;
  /** How the key was separated from its value; anything but `:` is tentative until the key is known. */
  sep?: ':' | '=' | '->' | ' ';
  value?: Loose;
  form: ItemForm;
  lines: string[];
  /** Line-level repairs that hold only if the item is kept as a declaration. */
  pending?: Repair[];
}

export const MAX_REPAIR_PASSES = 4;
