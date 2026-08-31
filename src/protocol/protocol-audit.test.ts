/**
 * Criterion-1 audit of the SHIPPED attached protocol file.
 * Drives assembleProtocolFile / buildProtocolFileContent — not a copy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildProtocolFileContent, buildComposerStub, buildFollowupComposerText } from './builder';
import { assembleProtocolFile, PROTOCOL_VERSION } from './protocol';
import {
  catalogRefuseTypes,
  catalogSpecTypes,
  hasSoftLanguage,
  renderArchetypeRegistry,
  renderDiagramRegistry,
  renderVerificationRegistry,
} from './registries';
import { FAMILY_CATALOG } from '@/src/lib/figure/catalog';

const FILE = buildProtocolFileContent({ question: 'sizing' }).content;

function acceptedEngineKeys(): Record<string, Set<string>> {
  const engines = ['scene', 'plot', 'graph', 'table', 'circuit'] as const;
  type Engine = (typeof engines)[number];
  const sources = Object.fromEntries(engines.map((engine) => [
    engine,
    readFileSync(resolve(process.cwd(), `src/lib/figure/engines/${engine}.ts`), 'utf8'),
  ])) as Record<Engine, string>;
  const keys = Object.fromEntries(engines.map((engine) => [engine, new Set<string>()])) as Record<Engine, Set<string>>;
  const quoted = (text: string) => [...text.matchAll(/['"]([a-z][a-z0-9_.-]*)['"]/gi)].map((match) => match[1]!.toLowerCase());
  for (const match of sources.scene.matchAll(/keysAreKnown\(spec,\s*\[([^\]]*)\]\)/g)) quoted(match[1]!).forEach((key) => keys.scene.add(key));
  const sharedScene = /new Set\(\[\.\.\.allowed,([^\]]*)\]\)/.exec(sources.scene)?.[1] ?? '';
  quoted(sharedScene).forEach((key) => keys.scene.add(key));
  for (const match of sources.plot.matchAll(/spec(?:Get|GetAll|Has)\(spec,\s*['"]([^'"]+)['"]\)/g)) keys.plot.add(match[1]!.toLowerCase());
  for (const match of sources.plot.matchAll(/spec\.(caption|highlight)\b/g)) keys.plot.add(match[1]!.toLowerCase());
  for (const match of [...sources.graph.matchAll(/const GRAPH_KEYS\s*=\s*new Set\(\[([^\]]*)\]\)/g)]) quoted(match[1]!).forEach((key) => keys.graph.add(key));
  for (const match of [...sources.circuit.matchAll(/const CONTROL_KEYS\s*=\s*new Set\(\[([^\]]*)\]\)/g)]) quoted(match[1]!).forEach((key) => keys.circuit.add(key));
  for (const match of sources.table.matchAll(/const (?:COMMON|MATRIX|ICE|PUNNETT)_KEYS\s*=\s*new Set\(\[([^\]]*)\]\)/g)) quoted(match[1]!).forEach((key) => keys.table.add(key));
  return keys;
}

describe('shipped protocol file (criterion 1)', () => {
  it('is assembled by the shipped function', () => {
    expect(FILE).toBe(assembleProtocolFile());
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

  it('publishes compiler-executable spec forms instead of treating admission hints as keys', () => {
    expect(FILE).toContain('the `any` column is admission only, not an allowed-key list');
    expect(FILE).toContain('data: x,y; x,y');
    expect(FILE).toContain('edge: from to label words; rankdir: LR|TB|TD; highlight: declared node. never emit `kind:` as a graph key');
    expect(FILE).toContain('table rows: choose comma or semicolon for each whole row; use semicolons if a cell has commas; no commas in semicolon cells; never mix or pipe-delimit;');
    expect(FILE).toContain('kind: fbd uses body/force/axes');
    expect(FILE).toContain('hash\tm: integer 1..10; buckets: bucket:value');
  });

  it('does not advertise unlisted, zero-demand template families', () => {
    const rows = new Set(
      renderDiagramRegistry()
        .split('\n')
        .filter((line) => /^[a-z][a-z0-9.-]*\t/.test(line))
        .map((line) => line.split('\t', 1)[0]),
    );
    for (const type of ['bz', 'dq', 'knot', 'mospi', 'rama']) expect(rows.has(type), `dead row ${type}`).toBe(false);
    expect(renderDiagramRegistry()).toContain('Unlisted families mean OMIT');
  });

  it('uses ENGINE and TEMPLATE headings instead of repeating the row kind', () => {
    const registry = renderDiagramRegistry();
    expect(registry).toContain('ENGINE\ntype\tkeys');
    expect(registry).toContain('TEMPLATE\ntype\tkeys');
    expect(registry).not.toMatch(/\t(?:engine|leftover)\t/);
  });

  it('keeps engine schema anchors in one registry line; full schemas live in core', () => {
    const lines = renderDiagramRegistry().split('\n');
    const start = lines.findIndex((line) => line.startsWith('ENGINE SCHEMAS —'));
    const end = lines.indexOf('TEMPLATE');
    const redundantRows = lines.slice(start, end).filter((line) => /^(plot|scene|graph|table|circuit)\t/.test(line));
    expect(redundantRows).toHaveLength(0);
    expect(lines[start]!).toContain('data: x,y; x,y');
  });

  it('keeps proof and verification failure rules at their shared anchors', () => {
    const archetype = renderArchetypeRegistry();
    const verification = renderVerificationRegistry();
    expect(archetype).not.toContain('A proof MUST NOT grow a numeric-substitution step.');
    expect(archetype).toMatch(/^proof\t.*NEVER a "plug into the formula" step.*NEVER numeric substitution/m);
    expect(verification).toContain('On fail, add a visible correction @step');
    expect(verification).toMatch(/^dimensional\t.*visible @correction/m);
    expect(verification.match(/Fail → visible correction\./g) ?? []).toHaveLength(0);
  });
});

describe('schema-first protocol contract', () => {
  it('documents every engine-consumed key as an explicit schema line', () => {
    const documented = new Map<string, Set<string>>();
    for (const match of FILE.matchAll(/^SCHEMA\s+(scene|plot|graph|table|circuit)(?:\.[a-z0-9-]+)?\s+key=([a-z0-9_.-]+)\s+::\s+\S.*$/gim)) {
      const set = documented.get(match[1]!.toLowerCase()) ?? new Set<string>();
      set.add(match[2]!.toLowerCase());
      documented.set(match[1]!.toLowerCase(), set);
    }
    for (const [engine, keys] of Object.entries(acceptedEngineKeys())) {
      for (const key of keys) expect(documented.get(engine)?.has(key), `missing SCHEMA ${engine} key=${key}`).toBe(true);
    }
    expect(FILE).toMatch(/^SCHEMA circuit device-key=<designator> ::/m);
  });

  it('keeps the template placeholder-only and marker-balanced', () => {
    const template = FILE.slice(FILE.indexOf('TEMPLATE —'), FILE.indexOf('<repeat @step'));
    expect(template).toContain('$<symbol>$ is <meaning>. With <givens>: $<symbol>=<plug-in>=<result> <units>.');
    expect(template).toContain('@diagram id=fN type=<family>');
    expect(template).not.toMatch(/X_L|377|75\.4|1\.5\s*\*\s*x\^2|Proof @body example|Code @body example|Lab @body example/);
    expect(template.match(/^@body$/gm)).toHaveLength(1);
    expect(template.match(/^@endbody$/gm)).toHaveLength(1);
    expect(template.match(/^@diagram\b/gm)).toHaveLength(1);
    expect(template.match(/^@enddiagram$/gm)).toHaveLength(1);
  });

  it('puts schema before every specimen and retains all five engine families', () => {
    const specimenTypes = new Set<string>();
    const lines = FILE.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const type = /^@diagram\b.*\btype=([^\s]+)/.exec(lines[index]!)?.[1];
      if (!type || type === '<family>') continue;
      specimenTypes.add(type);
      expect(lines[index - 1], `schema must directly precede specimen ${type}`).toMatch(/^SCHEMA .* SPECIMEN follows/);
    }
    for (const type of ['scene', 'plot', 'graph', 'table', 'circuit']) expect(specimenTypes.has(type), `missing ${type} specimen`).toBe(true);
  });

  it('keeps one format specimen per engine family plus the pinned field form', () => {
    const ids = [...FILE.matchAll(/^@diagram id=(f\d+) type=/gm)].map((match) => match[1]);
    expect(ids).toEqual(['f1', 'f2', 'f3', 'f5', 'f6', 'f9']);
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
  it('ships the deep depth dial and drops Prefer hedges', () => {
    expect(FILE).toContain('DEPTH: deep');
    expect(FILE).not.toContain('DEPTH: balanced');
    expect(FILE).not.toMatch(/Prefer the standard textbook path\. Do not skip symbol definitions or substitution\./);
    expect(FILE).not.toMatch(/\bPrefer the standard textbook path\b/);
    expect(FILE).not.toMatch(/\bPrefer the upper step-count bound\b/);
  });

  it('keeps archetype body shapes outside the placeholder-only template', () => {
    expect(FILE).toContain('BODY SHAPES — grammar only');
    expect(FILE).toContain('NUMERIC/LAB @body grammar');
    expect(FILE).toContain('Proof @body grammar');
    expect(FILE).not.toContain('NUMERIC/LAB example only');
  });

  it('qualifies visual MUST to state-changing steps', () => {
    expect(FILE).toMatch(/Visual state-changing steps MUST include a complete labeled @diagram SPEC/i);
    expect(FILE).not.toMatch(/^CRITICAL:.*Visual steps MUST include a complete labeled @diagram SPEC \(not SVG\)\.$/m);
  });

  it('keeps text-heavy source layouts from becoming unrelated graph diagrams', () => {
    expect(FILE).toContain('Text/tabular source: keep its table/list/code layout; never substitute graph.');
  });

  it('shows the defining states of a structural or data transformation', () => {
    expect(FILE).toContain('Transformation: show input, every structural/data-state change, and output; never only endpoint.');
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
    expect(FILE).toContain('@diagram id=f9 type=field');
    expect(FILE).toContain('catalog: solenoid');
    expect(FILE).toContain('core: mu_r=sample');
    expect(FILE).toContain('B: value units');
    expect(FILE).toContain('H: ?');
    expect(FILE).toContain('@diagram id=f1 type=circuit');
    expect(FILE).toContain('std: ieee');
    expect(FILE).toContain('V_source: node_input 0 DC 1');
    expect(FILE).toContain('R_load: node_input node_output 1k');
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
    expect(FILE).toContain(
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
