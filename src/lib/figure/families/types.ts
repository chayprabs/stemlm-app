/**
 * Extension families: figure families added as self-describing packs.
 *
 * A pack is two files so the chat-page content script stays small. The manifest (tokens, admission
 * keys, guide text) is light and is read by the catalog and the protocol; the compilers load with
 * the study panel only.
 */
import type { CompileCtx, CompileResult } from '../types';
import type { SpecDoc } from '../spec';

export type FamilySubject =
  | 'Physics' | 'Chemistry' | 'Math' | 'Biology' | 'CS' | 'Electrical' | 'Mechanical' | 'Civil' | 'Chemical';

export interface FamilyManifest {
  /** Canonical `type=` token: lowercase letters, digits, `.` or `-`. */
  token: string;
  /** Other spellings of the token a model may write (`bar-chart`, `histogram`). */
  aliases?: string[];
  /** Every one of these keys must be present. */
  required?: string[];
  /** At least one of these keys must be present. */
  requiredAny?: string[];
  /** Every key the compiler reads, canonical spelling. Drives key repair and the guide. */
  keys: string[];
  /** Subjects whose guide row advertises this family. */
  subjects: FamilySubject[];
  /** One-line grammar for the guide, in the terse style of core-protocol.md TEMPLATE FORMS. */
  grammar: string;
  /** A small spec body (no @diagram markers) that compiles; printed in the guide as the specimen. */
  specimen: string;
}

export type FamilyCompiler = (spec: SpecDoc, ctx: CompileCtx) => CompileResult | Promise<CompileResult>;

/** Compilers of one pack, keyed by canonical token. */
export type FamilyCompilers = Record<string, FamilyCompiler>;
