#!/usr/bin/env node
/**
 * Extract the keys every figure family reads, for the spec repair layer (src/lib/figure/intel).
 *   node scripts/figure-vocabulary.mjs           write src/lib/figure/intel/vocabulary.generated.ts
 *   node scripts/figure-vocabulary.mjs --check   exit 1 when the checked-in file is stale
 *
 * Most families have no declared key list: they read keys ad hoc with specGet(spec, 'key'). This
 * script reads the compiler sources statically (TypeScript AST, nothing is executed) and collects,
 * per family, every key literal that reaches a spec reader:
 *   - directly: specGet | specGetAll | specList | specNumber | specHas...(spec, 'key')
 *   - through a local helper whose parameter flows into a reader (csvValue(spec, 'front'))
 *   - through an allowed-key list checked against the declared keys (new Set([...]).has(key))
 *   - through a module constant named *_KEYS that the compiler references
 * and follows calls between compiler functions, across files. The arity of a key is the strongest
 * reader that reaches it: `one` (specGet), `many` (specGetAll), `list` (specList), else `any`.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

// Plain path arithmetic: under a DOM test environment the global URL is not Node's.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const figureDir = resolve(root, 'src/lib/figure');
const OUTPUT = resolve(figureDir, 'intel/vocabulary.generated.ts');

/** Reader primitives of spec.ts: the key is always the second argument. */
const READERS = {
  specGet: 'one',
  specNumber: 'one',
  specGetAll: 'many',
  specList: 'list',
  specHas: 'any',
  specHasEmptyDeclaration: 'any',
  specHasEmptyDelimitedValue: 'any',
};
const ARITY_RANK = { any: 0, one: 1, many: 2, list: 3 };
const ITERATORS = new Set(['some', 'every', 'filter', 'map', 'find', 'findIndex', 'forEach', 'flatMap']);

/** Engine entry points, as dispatched by src/lib/figure/compile.ts. */
const ENGINES = {
  plot: ['engines/plot.ts', 'compilePlot'],
  scene: ['engines/scene.ts', 'compileScene'],
  graph: ['engines/graph.ts', 'compileGraph'],
  table: ['engines/table.ts', 'compileTable'],
  circuit: ['engines/circuit.ts', 'compileCircuit'],
};

const stronger = (a, b) => (ARITY_RANK[a] >= ARITY_RANK[b] ? a : b);

function unwrap(node) {
  let current = node;
  while (current && (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isNonNullExpression(current) || ts.isSatisfiesExpression(current))) {
    current = current.expression;
  }
  return current;
}

function parseModule(file) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.ESNext, true);
  const functions = new Map();
  const consts = new Map();
  const imports = new Map();
  const addFunction = (name, node) => {
    functions.set(name, {
      name,
      file,
      node,
      params: node.parameters.map((param) => ({ name: ts.isIdentifier(param.name) ? param.name.text : '', rest: Boolean(param.dotDotDotToken) })),
      keyParams: new Map(),
      reads: new Map(),
      callees: new Set(),
    });
  };
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text.startsWith('.')) {
      const target = `${resolve(dirname(file), statement.moduleSpecifier.text)}.ts`;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) imports.set(element.name.text, { file: target, name: (element.propertyName ?? element.name).text });
      }
    } else if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
      addFunction(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
        const init = unwrap(declaration.initializer);
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) addFunction(declaration.name.text, init);
        else consts.set(declaration.name.text, init);
      }
    }
  }
  return { file, source, functions, consts, imports };
}

class Extractor {
  constructor() {
    this.modules = new Map();
  }

  module(file) {
    if (!this.modules.has(file)) this.modules.set(file, parseModule(file));
    return this.modules.get(file);
  }

  /** The function a call names, local first, then through a relative import. */
  lookup(mod, name) {
    const local = mod.functions.get(name);
    if (local) return local;
    const imported = mod.imports.get(name);
    if (!imported || !imported.file.startsWith(figureDir)) return undefined;
    try {
      return this.module(imported.file).functions.get(imported.name);
    } catch {
      return undefined;
    }
  }

  /** One pass over a function body; returns whether a helper's key parameters grew. */
  analyse(mod, fn) {
    const locals = new Map();
    const derived = new Map();
    const paramIndex = new Map(fn.params.map((param, index) => [param.name, index]));
    let enumeratesKeys = false;
    const collect = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) locals.set(node.name.text, node.initializer);
      if (ts.isForOfStatement(node) && ts.isVariableDeclarationList(node.initializer)) {
        const name = node.initializer.declarations[0]?.name;
        if (name && ts.isIdentifier(name)) derived.set(name.text, node.expression);
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ITERATORS.has(node.expression.name.text)) {
        const callback = node.arguments[0];
        const first = callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) ? callback.parameters[0]?.name : undefined;
        if (first && ts.isIdentifier(first)) derived.set(first.text, node.expression.expression);
      }
      if (ts.isPropertyAccessExpression(node) && node.name.text === 'keys' && ts.isPropertyAccessExpression(node.expression) && /^(values|lists)$/.test(node.expression.name.text)) {
        enumeratesKeys = true;
      }
      ts.forEachChild(node, collect);
    };
    collect(fn.node.body);

    const resolveKeys = (expression, seen = new Set()) => {
      const out = { literals: [], params: [] };
      const node = unwrap(expression);
      if (!node || seen.has(node)) return out;
      seen.add(node);
      const merge = (other) => { out.literals.push(...other.literals); out.params.push(...other.params); };
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.literals.push(node.text);
      else if (ts.isArrayLiteralExpression(node)) node.elements.forEach((element) => merge(resolveKeys(element, seen)));
      else if (ts.isSpreadElement(node)) merge(resolveKeys(node.expression, seen));
      else if (ts.isConditionalExpression(node)) { merge(resolveKeys(node.whenTrue, seen)); merge(resolveKeys(node.whenFalse, seen)); }
      else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Set' && node.arguments?.[0]) merge(resolveKeys(node.arguments[0], seen));
      else if (ts.isIdentifier(node)) {
        const name = node.text;
        if (derived.has(name)) merge(resolveKeys(derived.get(name), seen));
        else if (paramIndex.has(name)) out.params.push(paramIndex.get(name));
        else if (locals.has(name)) merge(resolveKeys(locals.get(name), seen));
        else if (mod.consts.has(name)) merge(resolveKeys(mod.consts.get(name), seen));
      }
      return out;
    };

    let grew = false;
    const record = (expression, arity) => {
      const keys = resolveKeys(expression);
      for (const literal of keys.literals) fn.reads.set(literal.toLowerCase(), stronger(fn.reads.get(literal.toLowerCase()) ?? 'any', arity));
      for (const index of keys.params) {
        const next = stronger(fn.keyParams.get(index) ?? 'any', arity);
        if (fn.keyParams.get(index) !== next) { fn.keyParams.set(index, next); grew = true; }
      }
    };

    const visit = (node) => {
      if (ts.isIdentifier(node) && /_KEYS$/.test(node.text) && mod.consts.has(node.text)) record(node, 'any');
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        if (ts.isIdentifier(callee)) {
          if (Object.prototype.hasOwnProperty.call(READERS, callee.text)) {
            if (node.arguments[1]) record(node.arguments[1], READERS[callee.text]);
          } else {
            const target = this.lookup(mod, callee.text);
            if (target) {
              fn.callees.add(target);
              for (const [index, arity] of target.keyParams) {
                const rest = target.params[index]?.rest;
                node.arguments.forEach((argument, position) => {
                  if (position === index || (rest && position > index)) record(argument, arity);
                });
              }
            }
          }
        } else if (enumeratesKeys && ts.isPropertyAccessExpression(callee) && /^(has|includes)$/.test(callee.name.text)) {
          record(callee.expression, 'any');
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(fn.node.body);
    return grew;
  }

  /** Helper key parameters feed their callers, so every loaded function is analysed to a fixed point. */
  settle() {
    for (let round = 0; round < 12; round++) {
      let grew = false;
      for (const mod of [...this.modules.values()]) {
        for (const fn of mod.functions.values()) grew = this.analyse(mod, fn) || grew;
      }
      if (!grew && round > 0) return;
    }
  }

  vocabulary(fn, seen = new Set()) {
    const out = new Map();
    if (!fn || seen.has(fn)) return out;
    seen.add(fn);
    for (const [key, arity] of fn.reads) out.set(key, arity);
    for (const callee of fn.callees) {
      for (const [key, arity] of this.vocabulary(callee, seen)) out.set(key, stronger(out.get(key) ?? 'any', arity));
    }
    return out;
  }
}

/** The compiler functions a template token dispatches to, from the TABLE literal of leftovers/index.ts. */
function templateEntries(mod) {
  const table = mod.consts.get('TABLE');
  const entries = new Map();
  if (!table || !ts.isObjectLiteralExpression(table)) throw new Error('leftovers/index.ts: TABLE literal not found');
  for (const property of table.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const token = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : undefined;
    if (!token) continue;
    const names = [];
    const init = unwrap(property.initializer);
    if (ts.isIdentifier(init)) names.push(init.text);
    else {
      const visit = (node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) names.push(node.expression.text);
        ts.forEachChild(node, visit);
      };
      visit(init);
    }
    entries.set(token, names);
  }
  return entries;
}

/** family token -> { key -> arity }, both sorted. */
export function extractVocabulary() {
  const extractor = new Extractor();
  const leftovers = resolve(figureDir, 'leftovers');
  const engines = resolve(figureDir, 'engines');
  for (const dir of [leftovers, engines]) {
    for (const name of readdirSync(dir).filter((entry) => entry.endsWith('.ts') && !entry.endsWith('.test.ts')).sort()) extractor.module(resolve(dir, name));
  }
  extractor.settle();

  const families = new Map();
  for (const [token, [file, name]] of Object.entries(ENGINES)) {
    families.set(token, extractor.vocabulary(extractor.module(resolve(figureDir, file)).functions.get(name)));
  }
  const index = extractor.module(resolve(leftovers, 'index.ts'));
  for (const [token, names] of templateEntries(index)) {
    const keys = new Map();
    for (const name of names) {
      for (const [key, arity] of extractor.vocabulary(extractor.lookup(index, name))) keys.set(key, stronger(keys.get(key) ?? 'any', arity));
    }
    families.set(token, keys);
  }

  const out = {};
  for (const token of [...families.keys()].sort()) {
    const keys = families.get(token);
    // A family with no reads is one the dispatcher refuses outright; it has no vocabulary to repair toward.
    if (!keys.size) continue;
    out[token] = Object.fromEntries([...keys.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }
  return out;
}

export function renderVocabularyModule(vocabulary) {
  const lines = [
    '/**',
    ' * GENERATED by scripts/figure-vocabulary.mjs. Do not edit by hand.',
    ' * Re-run `node scripts/figure-vocabulary.mjs` after changing which keys a figure family reads;',
    ' * vocabulary.test.ts fails while this file is stale.',
    ' *',
    ' * family token -> key -> arity, where the arity is the strongest spec reader that reaches the key:',
    ' * `one` (specGet/specNumber), `many` (specGetAll), `list` (specList), `any` (only allow-listed or probed).',
    ' */',
    "export type KeyArity = 'one' | 'many' | 'list' | 'any';",
    '',
    'export const GENERATED_VOCABULARY: Readonly<Record<string, Readonly<Record<string, KeyArity>>>> = {',
  ];
  for (const [token, keys] of Object.entries(vocabulary)) {
    const body = Object.entries(keys).map(([key, arity]) => `${JSON.stringify(key)}: '${arity}'`).join(', ');
    lines.push(`  ${JSON.stringify(token)}: { ${body} },`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

export const VOCABULARY_OUTPUT = OUTPUT;

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const rendered = renderVocabularyModule(extractVocabulary());
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(OUTPUT, 'utf8'); } catch { /* a missing file is stale */ }
    if (current !== rendered) {
      console.error('[figure-vocabulary] vocabulary.generated.ts is stale: run `node scripts/figure-vocabulary.mjs`');
      process.exit(1);
    }
    console.log('[figure-vocabulary] up to date');
  } else {
    writeFileSync(OUTPUT, rendered);
    console.log(`[figure-vocabulary] ${Object.keys(extractVocabulary()).length} families -> ${OUTPUT}`);
  }
}
