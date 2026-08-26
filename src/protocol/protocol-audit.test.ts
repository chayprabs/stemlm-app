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
    expect(text).toContain('ASK-IN-CHAT CONTRACT');
    expect(text).toContain('mode: resolve');
    expect(text).not.toContain('OUTPUT:');
    expect(text).not.toContain('ARCHETYPE REGISTRY');
    expect(text).not.toContain('PHYSICS: subject=');
    expect(text).not.toContain('--- stemLM instructions');
    expect(Buffer.byteLength(text, 'utf8')).toBeLessThanOrEqual(4000);
  });
});

describe('remaining-gap inventory (shipped assembleProtocolFile)', () => {
  it('scopes DEPTH substitution to numeric/lab and drops Prefer hedges', () => {
    expect(FILE).toContain('DEPTH: balanced');
    expect(FILE).toContain('NUMERIC/LAB only: do not skip symbol definitions or substitution');
    expect(FILE).not.toMatch(/Prefer the standard textbook path\. Do not skip symbol definitions or substitution\./);
    expect(FILE).not.toMatch(/\bPrefer the standard textbook path\b/);
    expect(FILE).not.toMatch(/\bPrefer the upper step-count bound\b/);
  });

  it('labels the template numeric body and includes a non-numeric @body example', () => {
    expect(FILE).toContain('NUMERIC/LAB example only');
    expect(FILE).toMatch(/Proof @body example/i);
  });

  it('qualifies visual MUST to state-changing steps', () => {
    expect(FILE).toMatch(/Visual state-changing steps MUST include a complete labeled @diagram SPEC/i);
    expect(FILE).not.toMatch(/^CRITICAL:.*Visual steps MUST include a complete labeled @diagram SPEC \(not SVG\)\.$/m);
  });

  it('keeps leftover types but prefers ENGINE then the subject row', () => {
    expect(FILE).toContain('Use ENGINE types first, then the subject row');
    expect(FILE).toContain('TEMPLATE');
    expect(FILE).toContain('hybridpi');
    expect(FILE).toContain('anatomy');
  });

  it('uses catalog hybridpi/opamp keys and does not list Physics sfd', () => {
    expect(FILE).toContain('rpi,gm,re,rc');
    expect(FILE).toContain('rf,rg');
    expect(FILE).not.toMatch(/hybridpi REQUIRES rpi,gm,RE,RC/);
    expect(FILE).not.toMatch(/opamp REQUIRES Rf,Rg/);
    const physicsLine = FILE.split('\n').find((l) => l.startsWith('PHYSICS\t'));
    expect(physicsLine, 'Physics TSV row').toBeTruthy();
    expect(physicsLine).not.toMatch(/(^|\t|,)sfd(,|\t|$)/);
    expect(physicsLine).toMatch(/field/);
  });

  it('teaches typed field and circuit specs, not a prose SPEC paragraph', () => {
    expect(FILE).toContain('@diagram id=f6 type=field');
    expect(FILE).toContain('catalog: solenoid');
    expect(FILE).toContain('core: mu_r=400');
    expect(FILE).toContain('B: 1.0 T');
    expect(FILE).toContain('H: ?');
    expect(FILE).toContain('@diagram id=f1 type=circuit');
    expect(FILE).toContain('std: ieee');
    expect(FILE).toContain('V1: n_in 0 DC 12');
    expect(FILE).toContain('R1: n_in n_a 4k');
    expect(FILE).not.toMatch(/SPEC:\s+A /);
    expect(FILE).not.toMatch(/viewBox="0 0 300 180"/);
    expect(FILE).toMatch(/NEVER <svg>/i);
    expect(FILE).toMatch(/never a prose paragraph/i);
  });

  it('ships TSV subject rows without duplicate paragraph chapters', () => {
    expect(FILE).toContain('SUBJECT REGISTRY');
    expect(FILE).toContain('subject\tarchetypes\tdiagrams\tverify\tnodraw\tnotation\ttraps');
    expect(FILE).not.toContain('PHYSICS: subject=');
    expect(FILE).not.toContain('ELECTRICAL: subject=');
    expect(FILE).not.toMatch(/PRINCIPLES:/);
    expect(FILE).toContain('NMR δ increases right-to-left');
    expect(FILE).toContain('Fischer D/L ≠ R/S');
    expect(FILE).toContain('Oh CFT t2g below eg');
    expect(FILE).toContain('quote every mermaid node label');
    expect(FILE).not.toContain('type=punnett');
  });

  it('copies locale circuit into std: and names the protocol file as not the problem', () => {
    expect(FILE).toMatch(/Copy @meta locale circuit=IEEE\|IEC into (?:this spec as )?std:/i);
    expect(FILE).toContain('any attached file is the problem, not the protocol file');
    expect(FILE).toContain('intro + DEPTH deep');
    expect(FILE).toContain('Add skipped algebra and named substitutions');
    expect(assembleProtocolFile('ultra')).toContain(
      'At intro, DEPTH deep adds skipped algebra and named substitutions',
    );
  });

  it('lists extra follow-up cases including empty no-op', () => {
    for (const n of [
      'revert last patch',
      'only the diagram is wrong',
      'translate this',
      "hint, don't solve",
      'check my working',
      'multiple-choice',
      'skip to the answer',
      'change two givens',
      'explain this formula only',
      'empty follow-up',
    ]) {
      expect(FILE, `missing follow-up case ${n}`).toContain(n);
    }
  });

  it('does not smuggle research-only family tokens as type=', () => {
    const forbidden = [
      'nline',
      'shaft',
      'punnett',
      'pedigree',
      'magcirc',
      'devicemodel',
      'crispr',
      'western',
      'karyo',
      'sfd-bmd',
      'airfoil',
      'ttt',
      'poincare',
      'penrose',
      'heap',
      'dfa',
    ];
    for (const t of forbidden) {
      expect(FILE, `type=${t}`).not.toMatch(new RegExp(`type=${t}\\b`, 'i'));
    }
    expect(FILE).not.toMatch(/JSON capsule/i);
    expect(FILE).toMatch(/NEVER.*AI images/i);
  });
});
