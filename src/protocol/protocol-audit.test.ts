/**
 * Criterion-1 audit of the SHIPPED attached protocol file.
 * Drives assembleProtocolFile / buildProtocolFileContent — not a copy.
 */
import { describe, it, expect } from 'vitest';
import { buildProtocolFileContent, buildComposerStub, buildFollowupComposerText } from './builder';
import { assembleProtocolFile, PROTOCOL_VERSION } from './protocol';
import { catalogRefuseTypes, catalogSpecTypes, hasSoftLanguage } from './registries';
import { FAMILY_CATALOG } from '@/src/lib/figure/catalog';

const FILE = buildProtocolFileContent({ question: 'sizing' }).content;

describe('shipped protocol file (criterion 1)', () => {
  it('is assembled by the shipped function and matches the variant assembler', () => {
    expect(FILE).toBe(assembleProtocolFile('balanced'));
    expect(FILE.length).toBeGreaterThan(2000);
  });

  it('is imperative and has no banned hedging', () => {
    expect(hasSoftLanguage(FILE)).toBe(false);
    expect(FILE).not.toMatch(/should ideally/i);
    expect(FILE).not.toMatch(/\btry to\b/i);
    expect(FILE).not.toMatch(/where possible/i);
  });

  it('is not per-subject prose chapters', () => {
    expect(FILE).not.toMatch(/PHYSICS: one move\/step/);
    expect(FILE).not.toMatch(/PRINCIPLES: mechanics Newton/);
    expect(FILE).toContain('SUBJECT REGISTRY');
    expect(FILE).toContain('ARCHETYPE REGISTRY');
    expect(FILE).toContain('DIAGRAM REGISTRY');
  });

  it('covers the required thinking/emit rules', () => {
    const needles = [
      `version: ${PROTOCOL_VERSION}`,
      '@resume',
      '@step id=s',
      '@formula id=e',
      '@diagram id=f',
      'qid:',
      'numeric',
      'symbolic',
      'proof',
      'design',
      'comparison',
      'conceptual',
      'code',
      'lab',
      'estimation',
      'NEVER a "plug into the formula" step',
      'NUMERIC/LAB only',
      'NEVER force a numeric plug-in',
      'question:',
      '@q id=q',
      '@uncertainty',
      'assumption:',
      '@verify',
      'status: fail',
      'visible correction',
      'WHEN NOT TO DRAW',
      'NOTATION LOCALE',
      'circuit=IEEE|IEC',
      'LEVEL DIAL',
      'intro',
      'research',
      'NEVER echo',
      'NEVER ask the student clarifying',
      'NON-STEM',
      'ILL-POSED',
      'ALREADY ANSWERED',
      'OUTPUT LANGUAGE',
      'just the answer',
      'Prefix-parseable',
      'FORWARD COMPAT',
      'Original figures',
      'FOLLOW-UP CONTRACT',
      'mode: patch',
      'mode: resolve',
      'mode: new',
    ];
    for (const n of needles) {
      expect(FILE, `missing ${n}`).toContain(n);
    }
  });

  it('diagram type= / required keys are a subset of the research catalog', () => {
    const spec = new Set(catalogSpecTypes());
    const refuse = new Set(catalogRefuseTypes());
    const mentioned = new Set<string>();
    const typeRe = /(?:type=|^\s*)([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)/gim;
    // Only count explicit type= tokens in the protocol file.
    const explicit = FILE.matchAll(/\btype=([a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)/gi);
    for (const m of explicit) {
      if (m[1]) mentioned.add(m[1].toLowerCase());
    }
    // Mentions of forbidden tokens in NEVER/refuse lines are not invented syntax.
    const allowed = new Set([...spec, ...refuse, 'mermaid']);
    for (const t of mentioned) {
      if (t === 'svg') continue;
      expect(allowed.has(t) || t in FAMILY_CATALOG, `invented type=${t}`).toBe(true);
    }
    expect(FILE).toMatch(/NEVER emit type=svg/i);
    for (const t of spec) {
      expect(FILE, `catalog type ${t} missing from registry`).toContain(t);
    }
  });

  it('does not teach SVG coordinate craft', () => {
    expect(FILE).not.toMatch(/viewBox="0 0 300 180"/);
    expect(FILE).not.toMatch(/stroke-width 2/);
    expect(FILE).not.toMatch(/@diagram type=svg/);
    expect(FILE).toMatch(/NEVER <svg>/i);
  });
});

describe('composer stubs stay short and isolated', () => {
  it('keeps the student preamble short and below the sentinel', () => {
    const stub = buildComposerStub('Find the range of a projectile.');
    expect(stub).toContain('Find the range of a projectile.');
    expect(stub).toContain('--- stemLM ---');
    expect(stub.indexOf('Find the range')).toBeLessThan(stub.indexOf('--- stemLM ---'));
    expect(stub).not.toContain('OUTPUT:');
    expect(stub).not.toContain('@meta');
    expect(stub).toContain('stemlm-protocol.txt');
    expect(Buffer.byteLength(stub, 'utf8')).toBeLessThanOrEqual(900);
  });

  it('follow-up composer text is the short form only', () => {
    const text = buildFollowupComposerText({
      selection: 'Total resistance is R1 + R2',
      stepTitle: 'Solve for current',
      subject: 'Electrical',
      intent: 'ask',
    });
    expect(text).toContain('FOLLOW-UP CONTRACT');
    expect(text).toContain('mode: patch');
    expect(text).not.toContain('OUTPUT:');
    expect(text).not.toContain('ARCHETYPE REGISTRY');
    expect(text).not.toContain('PHYSICS: subject=');
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThanOrEqual(2200);
  });
});
