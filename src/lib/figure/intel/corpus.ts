/**
 * Repair corpus: specs written the way small and mid-size chat models drift from the guide
 * (GPT-3.5-class habits: synonyms, `=`; Gemini-Flash-class: Markdown bullets, bold keys, JSON, fences;
 * small open models: Mermaid, LaTeX, unicode math, YAML nesting), each with the strict spec it must
 * become. `UNTOUCHABLE` holds specs whose problem is content or ambiguity: they must stay hidden.
 *
 * Every REPAIRABLE source fails the strict compiler as written; corpus.test.ts proves that, then
 * proves the repaired spec is exactly `expect` and compiles.
 */

export interface RepairCase {
  name: string;
  type: string;
  content: string;
  expect: string;
  /** Family token after repair, when the type token itself is repaired. */
  expectType?: string;
}

export interface UntouchableCase {
  name: string;
  type: string;
  content: string;
  /** Why no faithful repair exists. */
  why: string;
  /** Text that must survive in the returned spec. */
  keeps?: string[];
}

type Row = [name: string, type: string, content: string, expect: string, expectType?: string];

const PARABOLA = 'fn: x^2\ndomain: -2 2';
const DIVIDER = 'V1: in 0 9V\nR1: in out 1k\nR2: out 0 2k';
const ICE = 'kind: ice\nspecies: N2, H2, NH3\ni: 1, 3, 0\nc: -x, -3x, +2x\ne: 1-x, 3-3x, 2x';
const PUNNETT = 'kind: punnett\ncols: A, a\nrows: A, a\ncells:\n  - AA, Aa\n  - Aa, aa';
const FBD = 'kind: fbd\nbody: block\nforce: W down on block\nforce: N up on block';
const TRIANGLE = 'kind: geom\npoint: A 0 0\npoint: B 4 0\npoint: C 0 3\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A';
const CHAIN = 'node: A\nnode: B\nnode: C\nedge: A B\nedge: B C';
const SFD = 'L: 6\nsupports: pin@0,roller@6\nloads: point 12kN down@2\nV: 0 8;2 8;2 -4;6 -4\nM: 0 0;2 16;6 0\nsign: sagging+';

const PLOT: Row[] = [
  ['plot: synonym keys and a worded range', 'plot', 'function: x^2\nrange: -3 to 3', 'fn: x^2\ndomain: -3 3'],
  ['plot: markdown bullets', 'plot', '- fn: sin(x)\n- domain: 0 6.28', 'fn: sin(x)\ndomain: 0 6.28'],
  ['plot: numbered list', 'plot', '1. fn: x^2\n2. domain: -2 2', PARABOLA],
  ['plot: bold keys', 'plot', '**fn**: x^2\n**domain**: -2 2', PARABOLA],
  ['plot: bold keys with the colon inside', 'plot', '**fn:** x^2\n**domain:** -2 2', PARABOLA],
  ['plot: backticked lines', 'plot', '`fn: x^2`\n`domain: -2 2`', PARABOLA],
  ['plot: equals separator', 'plot', 'fn = x^2\ndomain = -2 2', PARABOLA],
  ['plot: no separator', 'plot', 'fn x^2\ndomain -2 2', PARABOLA],
  ['plot: y = ... with a bracketed interval', 'plot', 'y = 2x + 1\ndomain: [-5, 5]', 'fn: 2x + 1\ndomain: -5 5'],
  ['plot: f(x) = ... with a dotted range', 'plot', 'f(x) = x^3 - 3x\ndomain: -2..2', 'fn: x^3 - 3x\ndomain: -2 2'],
  ['plot: unicode superscript and minus', 'plot', 'fn: x² − 4\ndomain: −3 3', 'fn: x^2 - 4\ndomain: -3 3'],
  ['plot: LaTeX fraction', 'plot', 'fn: \\frac{1}{x}\ndomain: 0.5 4', 'fn: 1/x\ndomain: 0.5 4'],
  ['plot: LaTeX in dollars', 'plot', 'fn: $\\sqrt{x^{2}+1}$\ndomain: -3 3', 'fn: sqrt(x^2 + 1)\ndomain: -3 3'],
  ['plot: variable times a bracket', 'plot', 'fn: x(x-2)\ndomain: -1 3', 'fn: x*(x - 2)\ndomain: -1 3'],
  ['plot: bare function argument and 2π', 'plot', 'fn: 2 sin x\ndomain: 0 to 2π', 'fn: 2*sin(x)\ndomain: 0 6.28318530718'],
  ['plot: absolute value bars', 'plot', 'fn: |x - 1|\ndomain: -2 4', 'fn: abs(x - 1)\ndomain: -2 4'],
  ['plot: square root sign', 'plot', 'fn: √x\ndomain: 0 9', 'fn: sqrt(x)\ndomain: 0 9'],
  ['plot: log base two', 'plot', 'fn: log_2(x)\ndomain: 1 16', 'fn: log2(x)\ndomain: 1 16'],
  ['plot: e^{-x} cos', 'plot', 'fn: e^{-x} \\cos(2x)\ndomain: 0 5', 'fn: e^(-x)*cos(2*x)\ndomain: 0 5'],
  ['plot: inequality range', 'plot', 'fn: sqrt(x)\ndomain: 0 <= x <= 9', 'fn: sqrt(x)\ndomain: 0 9'],
  ['plot: x in [a, b]', 'plot', 'fn: cos(x)\ndomain: x ∈ [-π, π]', 'fn: cos(x)\ndomain: -3.14159265359 3.14159265359'],
  ['plot: JSON object', 'plot', '{"type": "plot", "fn": "x^2", "domain": [-3, 3]}', 'fn: x^2\ndomain: -3 3'],
  ['plot: JSON with a min/max domain and labels', 'plot', '{"fn": "exp(-x)", "domain": {"min": 0, "max": 5}, "xlabel": "t (s)", "ylabel": "N"}', 'fn: exp(-x)\ndomain: 0 5\nxlabel: t (s)\nylabel: N'],
  ['plot: JSON in a fence with single quotes', 'plot', "```json\n{'fn': 'x^2', 'domain': [-2, 2],}\n```", PARABOLA],
  ['plot: JSON with x and y columns', 'plot', '{"kind":"discrete","x":[0,1,2],"y":[0,1,4],"domain":[0,3]}', 'kind: discrete\ndata: 0,0; 1,1; 2,4\ndomain: 0 3'],
  ['plot: wrapped JSON spec', 'plot', '{"id": "f1", "type": "plot", "spec": {"fn": "x^2", "domain": "-2 2"}}', PARABOLA],
  ['plot: axis label spellings', 'plot', 'fn: x\ndomain: 0 1\nx_label: time\ny-label: speed', 'fn: x\ndomain: 0 1\nxlabel: time\nylabel: speed'],
  ['plot: spaced axis keys', 'plot', 'X Axis Label: time (s)\nY Axis Label: v (m/s)\nfn: 2x\ndomain: 0 5', 'xlabel: time (s)\nylabel: v (m/s)\nfn: 2x\ndomain: 0 5'],
  ['plot: misspelt key', 'plot', 'fn: x^2\ndomian: -2 2', PARABOLA],
  ['plot: misspelt synonym', 'plot', 'fucntion: x^2\ndomain: -2 2', PARABOLA],
  ['plot: code fence', 'plot', '```\nfn: x^2\ndomain: -2 2\n```', PARABOLA],
  ['plot: diagram markers inside the body', 'plot', '@diagram id=f1 type=plot\nfn: x^2\ndomain: -2 2\n@enddiagram', PARABOLA],
  ['plot: type line repeats the family', 'plot', 'type: plot\nfn: x^2\ndomain: -2 2', PARABOLA],
  ['plot: styling keys', 'plot', 'fn: x^2\ndomain: -2 2\ncolor: blue\ngrid: true\nwidth: 600', PARABOLA],
  ['plot: title for caption', 'plot', 'title: Parabola\nfn: x^2\ndomain: -2 2', 'caption: Parabola\nfn: x^2\ndomain: -2 2'],
  ['graph: title for caption', 'graph', 'title: Shortest path\nnode: A\nnode: B\nedge: A B', 'caption: Shortest path\nnode: A\nnode: B\nedge: A B'],
  ['plot: function of t without var', 'plot', 'fn: 3t^2\ndomain: 0 4', 'fn: 3t^2\nvar: t\ndomain: 0 4'],
  ['plot: v(t) = ... in LaTeX', 'plot', 'fn: v(t) = 5 - 2t²\ndomain: 0 to 3', 'fn: 5 - 2*t^2\nvar: t\ndomain: 0 3'],
  ['plot: xmin and xmax', 'plot', 'fn: x^2\nxmin: -2\nxmax: 2', PARABOLA],
  ['plot: plural points as tuples', 'plot', 'fn: x^2\ndomain: -2 2\npoints: (1,1), (2,4)', 'fn: x^2\ndomain: -2 2\npoint: 1,1\npoint: 2,4'],
  ['plot: data as tuples', 'plot', 'kind: discrete\ndata: (0,0), (1,1), (2,4)\ndomain: 0 3', 'kind: discrete\ndata: 0,0; 1,1; 2,4\ndomain: 0 3'],
  ['plot: data as nested arrays', 'plot', 'kind: discrete\ndata: [[0, 1], [1, 3], [2, 5]]\ndomain: 0 3', 'kind: discrete\ndata: 0,1; 1,3; 2,5\ndomain: 0 3'],
  ['plot: vertical asymptote key', 'plot', 'fn: 1/(x-1)\ndomain: -2 4\npoles: 1\nvertical_asymptote: 1', 'fn: 1/(x-1)\ndomain: -2 4\npoles: 1\nasymptote: x=1'],
  ['plot: trailing commas', 'plot', 'fn: x^2,\ndomain: -2 2,', PARABOLA],
  ['plot: quoted values', 'plot', 'fn: "x^2"\ndomain: "-2 2"', PARABOLA],
  ['plot: kind synonym', 'plot', 'kind: scatter\ndata: 0,0; 1,2; 2,3\ndomain: 0 3', 'kind: discrete\ndata: 0,0; 1,2; 2,3\ndomain: 0 3'],
  ['plot: invisible characters', 'plot', 'fn:\u00a0x^2\u200b\ndomain: \u22122 2', PARABOLA],
  ['plot: YAML nested domain', 'plot', 'fn: x^2\ndomain:\n  min: -2\n  max: 2', PARABOLA],
  ['plot: equation and interval', 'plot', 'equation: y = x^2 - 1\ninterval: [-2, 2]', 'fn: x^2 - 1\ndomain: -2 2'],
  ['plot: bracketed pole list', 'plot', 'fn: 1/x\ndomain: -2 2\npoles: [0]', 'fn: 1/x\ndomain: -2 2\npoles: 0'],
  ['plot: type synonym', 'function-plot', PARABOLA, PARABOLA, 'plot'],
  ['plot: misspelt type', 'plott', 'function: x^2\ndomain: -2 2', PARABOLA, 'plot'],
  ['plot: no type, plot keys', 'svg', PARABOLA, PARABOLA, 'plot'],
  ['plot: scatter type implies the kind', 'scatter-plot', 'data: 0,0; 1,2; 2,3\ndomain: 0 3', 'kind: discrete\ndata: 0,0; 1,2; 2,3\ndomain: 0 3', 'plot'],
];

const GRAPH: Row[] = [
  ['graph: plural node and edge lists', 'graph', 'nodes: A, B, C\nedges: A->B, B->C', CHAIN],
  ['graph: arrow lines', 'graph', 'A -> B\nB -> C: next\nrankdir: LR', 'edge: A B\nedge: B C next\nrankdir: LR'],
  ['graph: weighted arrows', 'graph', 'A --4--> B\nB --2--> C', 'edge: A B 4\nedge: B C 2'],
  ['graph: unicode arrows', 'graph', 'A → B\nB → C', 'edge: A B\nedge: B C'],
  ['graph: arrow chain', 'graph', 'A -> B -> C -> D', 'edge: A B\nedge: B C\nedge: C D'],
  ['graph: arrow in an edge value and a worded direction', 'graph', 'node: A Start\nnode: B End\nedge: A -> B\ndirection: left-to-right', 'node: A Start\nnode: B End\nedge: A B\nrankdir: LR'],
  ['graph: JSON nodes and edges', 'graph', '{"nodes":[{"id":"A","label":"Start"},{"id":"B","label":"End"}],"edges":[{"from":"A","to":"B","label":"go"}]}', 'node: A Start\nnode: B End\nedge: A B go'],
  ['graph: JSON string nodes and pair edges', 'graph', '{"nodes": ["A", "B", "C"], "edges": [["A", "B"], ["B", "C"]]}', CHAIN],
  ['graph: JSON source/target/weight', 'graph', '{"edges": [{"source": "s", "target": "t", "weight": 7}], "rankdir": "LR"}', 'edge: s t 7\nrankdir: LR'],
  ['graph: YAML lists of maps', 'graph', 'nodes:\n  - id: A\n    label: Start\n  - id: B\n    label: Stop\nedges:\n  - from: A\n    to: B', 'node: A Start\nnode: B Stop\nedge: A B'],
  ['graph: lists under singular keys', 'graph', 'node:\n  - A start\n  - B finish\nedge:\n  - A B go', 'node: A start\nnode: B finish\nedge: A B go'],
  ['graph: Mermaid flowchart', 'mermaid', 'graph TD\n  A[Start] --> B{Valid?}\n  B -->|yes| C[Save]\n  B -->|no| D[Reject]', 'rankdir: TD\nnode: A Start\nnode: B Valid?\ndecision: B\nedge: A B\nnode: C Save\nedge: B C yes\nnode: D Reject\nedge: B D no', 'graph'],
  ['graph: Mermaid body under type=graph', 'graph', 'flowchart LR\nS([Start]) --> P[Read n]\nP --> Q{n > 0?}\nQ -- yes --> R[Print]\nQ -- no --> E([Stop])', 'rankdir: LR\nnode: S Start\nterminal: S\nnode: P Read n\nedge: S P\nnode: Q n > 0?\ndecision: Q\nedge: P Q\nnode: R Print\nedge: Q R yes\nnode: E Stop\nterminal: E\nedge: Q E no'],
  ['graph: state machine vocabulary', 'state-machine', 'states: q0, q1, q2\ninitial: q0\naccepting: q2\ntransitions: q0->q1: a, q1->q2: b', 'node: q0\nnode: q1\nnode: q2\nstart: q0\naccept: q2\nedge: q0 q1 a\nedge: q1 q2 b', 'graph'],
  ['graph: rankdir synonym', 'graph', 'node: A\nnode: B\nedge: A B\nrankdir: horizontal', 'node: A\nnode: B\nedge: A B\nrankdir: LR'],
  ['graph: nodes as their own keys', 'graph', 'A: Start\nB: Process\nC: End\nA -> B\nB -> C', 'node: A Start\nnode: B Process\nnode: C End\nedge: A B\nedge: B C'],
  ['graph: flowchart type token', 'flowchart', 'node: s Start\nnode: p Process\nedge: s p\nterminal: s', 'node: s Start\nnode: p Process\nedge: s p\nterminal: s', 'graph'],
  ['graph: misspelt keys', 'graph', 'noed: A\nnode: B\negde: A B', 'node: A\nnode: B\nedge: A B'],
  ['graph: tuple edges', 'graph', 'edges: (A, B), (B, C)\nnodes: [A, B, C]', 'edge: A B\nedge: B C\nnode: A\nnode: B\nnode: C'],
  ['graph: redundant directed flag', 'graph', 'directed: true\nnode: A\nnode: B\nedge: A B', 'node: A\nnode: B\nedge: A B'],
  ['graph: bullets and bold', 'graph', '- **node**: A Start\n- **node**: B End\n- **edge**: A B', 'node: A Start\nnode: B End\nedge: A B'],
  ['graph: layout key', 'graph', 'layout: TB\nnode: A\nnode: B\nedge: A B', 'rankdir: TB\nnode: A\nnode: B\nedge: A B'],
  ['graph: vertices and numbered ids', 'graph', 'vertices: 1, 2, 3\nedges: 1->2, 2->3', 'node: 1\nnode: 2\nnode: 3\nedge: 1 2\nedge: 2 3'],
  ['graph: highlight array in JSON', 'graph', '{"node": ["A", "B"], "edge": [["A", "B"]], "highlight": ["A", "B"]}', 'node: A\nnode: B\nedge: A B\nhighlight: A, B'],
  ['graph: type line and fence', 'graph', '```yaml\ntype: graph\nnode: A\nnode: B\nedge: A B\n```', 'node: A\nnode: B\nedge: A B'],
  ['graph: no type, node and edge keys', 'svg', 'node: A\nnode: B\nedge: A B', 'node: A\nnode: B\nedge: A B', 'graph'],
  ['graph: fsm type with arrow lines', 'fsm', 'start: s0\ns0 -> s1: 0\ns1 -> s0: 1\naccept: s1', 'start: s0\nedge: s0 s1 0\nedge: s1 s0 1\naccept: s1', 'graph'],
];

const TABLE: Row[] = [
  ['table: ICE without kind', 'table', 'species: N2, H2, NH3\ni: 1, 3, 0\nc: -x, -3x, +2x\ne: 1-x, 3-3x, 2x', ICE],
  ['table: ICE rows spelt out', 'table', 'kind: ice\nspecies: N2, H2, NH3\ninitial: 1, 3, 0\nchange: -x, -3x, +2x\nequilibrium: 1-x, 3-3x, 2x', ICE],
  ['table: ice-table type', 'ice-table', 'species: N2, H2, NH3\ni: 1, 3, 0\nc: -x, -3x, +2x\ne: 1-x, 3-3x, 2x', ICE, 'table'],
  ['table: ICE as JSON arrays', 'table', '{"kind": "ice", "species": ["N2", "H2", "NH3"], "i": [1, 3, 0], "c": ["-x", "-3x", "+2x"], "e": ["1-x", "3-3x", "2x"]}', ICE],
  ['table: ICE kind as a phrase', 'table', 'kind: ICE table\nspecies: N2, H2, NH3\ni: 1, 3, 0\nc: -x, -3x, +2x\ne: 1-x, 3-3x, 2x', ICE],
  ['table: punnett cells inline', 'table', 'kind: punnett\ncols: A, a\nrows: A, a\ncells: AA, Aa; Aa, aa', PUNNETT],
  ['table: punnett as JSON', 'table', '{"kind":"punnett","cols":["A","a"],"rows":["A","a"],"cells":[["AA","Aa"],["Aa","aa"]]}', PUNNETT],
  ['table: punnett list not indented', 'table', 'kind: punnett\ncols: A, a\nrows: A, a\ncells:\n- AA, Aa\n- Aa, aa', PUNNETT],
  ['table: punnett list with star bullets', 'table', 'kind: punnett\ncols: A, a\nrows: A, a\ncells:\n    * AA, Aa\n    * Aa, aa', PUNNETT],
  ['table: punnett-square kind', 'table', 'kind: punnett-square\ncols: A, a\nrows: A, a\ncells:\n  - AA, Aa\n  - Aa, aa', PUNNETT],
  ['table: punnett-square type', 'punnett-square', 'cols: A, a\nrows: A, a\ncells:\n  - AA, Aa\n  - Aa, aa', PUNNETT, 'table'],
  ['table: Markdown pipe table', 'table', 'kind: matrix\n| x | y |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |', 'kind: matrix\nheaders: x, y\nrow: 1, 2\nrow: 3, 4'],
  ['table: pipe table without kind', 'table', '| n | n^2 |\n| --- | --- |\n| 1 | 1 |\n| 2 | 4 |', 'kind: matrix\nheaders: n, n^2\nrow: 1, 1\nrow: 2, 4'],
  ['table: matrix without kind', 'table', 'headers: n, n^2\nrow: 1, 1\nrow: 2, 4', 'kind: matrix\nheaders: n, n^2\nrow: 1, 1\nrow: 2, 4'],
  ['table: type line names the kind', 'table', 'type: matrix\nheaders: a, b\nrow: 1, 2', 'kind: matrix\nheaders: a, b\nrow: 1, 2'],
  ['table: numbered rows', 'table', 'kind: matrix\nheaders: a, b\nrow1: 1, 2\nrow2: 3, 4', 'kind: matrix\nheaders: a, b\nrow: 1, 2\nrow: 3, 4'],
  ['table: columns for headers', 'table', 'kind: matrix\ncolumns: a, b\nrow: 1, 2\ntitle: Pairs', 'kind: matrix\nheaders: a, b\nrow: 1, 2\ncaption: Pairs'],
  ['table: misspelt kind', 'table', 'kind: matrx\nheaders: a, b\nrow: 1, 2', 'kind: matrix\nheaders: a, b\nrow: 1, 2'],
  ['table: matrix JSON rows', 'table', '{"kind": "matrix", "headers": ["x", "y"], "rows": [[1, 2], [3, 4]]}', 'kind: matrix\nheaders: x, y\nrows:\n  - 1, 2\n  - 3, 4'],
  ['table: matrix type with data rows', 'matrix', 'headers: i, j\ndata: [[0, 1], [1, 0]]', 'kind: matrix\nheaders: i, j\nrows:\n  - 0, 1\n  - 1, 0', 'table'],
  ['table: bold bullets', 'table', '- **kind**: matrix\n- **headers**: a, b\n- **row**: 1, 2', 'kind: matrix\nheaders: a, b\nrow: 1, 2'],
];

const SCENE: Row[] = [
  ['scene: free-body diagram without kind', 'scene', 'body: block\nforce: W down on block\nforce: N up on block', FBD],
  ['scene: free-body-diagram type', 'free-body-diagram', 'body: block\nforce: W down on block\nforce: N up on block', FBD, 'scene'],
  ['scene: fbd type', 'fbd', 'body: block\nforce: W down on block\nforce: N up on block', FBD, 'scene'],
  ['scene: kind as a phrase', 'scene', 'kind: free-body diagram\nbody: block\nforce: W down on block\nforce: N up on block', FBD],
  ['scene: type line names the kind', 'scene', 'type: fbd\nbody: block\nforce: W down on block\nforce: N up on block', FBD],
  ['scene: direction words', 'scene', 'kind: fbd\nbody: block\nforce: W downward on block\nforce: N upwards on block', FBD],
  ['scene: plural forces', 'scene', 'kind: fbd\nbody: block\nforces: W down on block, N up on block', FBD],
  ['scene: force with equals and comma', 'scene', 'kind: fbd\nbody: cart\nforce: F = 10 N, right on cart', 'kind: fbd\nbody: cart\nforce: F 10 N right on cart'],
  ['scene: forces as JSON records', 'scene', '{"kind":"fbd","body":"block","forces":[{"name":"W","direction":"down","on":"block"},{"name":"N","direction":"up","on":"block"}]}', FBD],
  ['scene: forces as a YAML list', 'scene', 'kind: fbd\nbody: block\nforces:\n  - W down on block\n  - N up on block', FBD],
  ['scene: incline synonym and normal', 'scene', 'kind: fbd\nbody: block\nincline: 30\nforce: W weight on block\nforce: N normal on block', 'kind: fbd\nbody: block\nincline_deg: 30\nforce: W weight on block\nforce: N normal+ on block'],
  ['scene: angle with a degree sign and article', 'scene', 'kind: fbd\nbody: sled\nforce: P 50 N at 30° from the horizontal on sled', 'kind: fbd\nbody: sled\nforce: P 50 N at 30 deg from horizontal on sled'],
  ['scene: misspelt force key', 'scene', 'kind: fbd\nbody: block\nfroce: W down on block\nforce: N up on block', FBD],
  ['scene: geometry without kind', 'scene', 'point: A 0 0\npoint: B 4 0\npoint: C 0 3\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A', TRIANGLE],
  ['scene: geometry type', 'geometry', 'point: A 0 0\npoint: B 4 0\npoint: C 0 3\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A', TRIANGLE, 'scene'],
  ['scene: points as tuples', 'scene', 'kind: geom\npoint: A (0, 0)\npoint: B (4, 0)\npoint: C (0, 3)\nsegment: AB A-B\nsegment: BC B to C\nsegment: CA C -> A', TRIANGLE],
  ['scene: plural points and segments', 'scene', 'kind: geom\npoints: A(0,0), B(4,0), C(0,3)\nsegments: AB: A to B, BC: B to C, CA: C to A', TRIANGLE],
  ['scene: points as JSON objects', 'scene', '{"kind": "geom", "points": [{"id": "A", "x": 0, "y": 0}, {"id": "B", "x": 4, "y": 0}, {"id": "C", "x": 0, "y": 3}], "segments": [["AB", "A", "B"], ["BC", "B", "C"], ["CA", "C", "A"]]}', TRIANGLE],
  ['scene: ray keys spelt out', 'scene', 'kind: ray\nfocal_length: 10\nobject_distance: 30\nobject_height: 5', 'kind: ray\nf: 10\ndo: 30\nho: 5'],
  ['scene: ray without kind', 'scene', 'f: 10\ndo: 25\nho: 4', 'kind: ray\nf: 10\ndo: 25\nho: 4'],
  ['scene: bullets and emphasis', 'scene', '* `kind`: fbd\n* `body`: block\n* `force`: W down on block\n* `force`: N up on block', FBD],
];

const CIRCUIT: Row[] = [
  ['circuit: lowercase designators', 'circuit', 'v1: in 0 9V\nr1: in out 1k\nr2: out 0 2k', DIVIDER],
  ['circuit: netlist lines without colons', 'circuit', 'V1 in 0 9V\nR1 in out 1k\nR2 out 0 2k', DIVIDER],
  ['circuit: equals after the designator', 'circuit', 'V1 = in 0 9V\nR1 = in out 1k\nR2 = out 0 2k', DIVIDER],
  ['circuit: component words as keys', 'circuit', 'battery: V1 in 0 9V\nresistor: R1 in out 1k\nresistor: R2 out 0 2k', DIVIDER],
  ['circuit: JSON component list', 'circuit', '{"components":[{"id":"V1","type":"voltage_source","nodes":["in","0"],"value":"9V"},{"id":"R1","type":"resistor","nodes":["in","out"],"value":"1k"},{"id":"R2","type":"resistor","from":"out","to":"0","value":"2k"}]}', DIVIDER],
  ['circuit: standard synonym', 'circuit', 'std: US\nV1: in 0 9V\nR1: in out 1k\nR2: out 0 2k', `std: ieee\n${DIVIDER}`],
  ['circuit: standard key', 'circuit', 'standard: IEC\nV1: in 0 9V\nR1: in out 1k\nR2: out 0 2k', `std: iec\n${DIVIDER}`],
  ['circuit: probe written with at', 'circuit', 'V1: in 0 9V\nR1: in out 1k\nR2: out 0 2k\nprobe: Vout at out', `${DIVIDER}\nprobe: Vout=out`],
  ['circuit: plural probes', 'circuit', 'V1: in 0 9V\nR1: in out 1k\nR2: out 0 2k\nprobes: Vout=out, Vin=in', `${DIVIDER}\nprobe: Vout=out\nprobe: Vin=in`],
  ['circuit: bullets', 'circuit', '- V1: in 0 9V\n- R1: in out 1k\n- R2: out 0 2k', DIVIDER],
  ['circuit: fence and type line', 'circuit', '```\ntype: circuit\nV1: in 0 9V\nR1: in out 1k\nR2: out 0 2k\n```', DIVIDER],
  ['circuit: circuit-diagram type', 'circuit-diagram', DIVIDER, DIVIDER, 'circuit'],
  ['circuit: misspelt type', 'circiut', DIVIDER, DIVIDER, 'circuit'],
  ['circuit: lowercase designators with commas', 'circuit', 'v1: in, 0, 9V\nr1: in, out, 1k\nr2: out, 0, 2k', DIVIDER],
  ['circuit: duplicated device line', 'circuit', 'V1: in 0 9V\nR1: in out 1k\nR1: in out 1k\nR2: out 0 2k', DIVIDER],
  ['circuit: misspelt probe key', 'circuit', 'V1: in 0 9V\nR1: in out 1k\nR2: out 0 2k\nprob: Vout=out', `${DIVIDER}\nprobe: Vout=out`],
];

const TEMPLATES: Row[] = [
  ['smiles: molecule type', 'molecule', 'smiles: CCO', 'smiles: CCO', 'chem.smiles'],
  ['smiles: singular key', 'chem.smiles', 'smile: c1ccccc1', 'smiles: c1ccccc1'],
  ['smiles: equals separator', 'chem.smiles', 'smiles = CC(=O)O', 'smiles: CC(=O)O'],
  ['smiles: no type', 'svg', 'smiles: CCO', 'smiles: CCO', 'chem.smiles'],
  ['smiles: JSON', 'chem.smiles', '{"type": "chem.smiles", "smiles": "CCO"}', 'smiles: CCO'],
  ['timing: signals as their own keys', 'timing', 'clk: p.......\ndata: 0.1..0..', 'signal: clk p.......\nsignal: data 0.1..0..'],
  ['timing: plural signals', 'timing', 'signals: clk p......., d 0.1..0..', 'signal: clk p.......\nsignal: d 0.1..0..'],
  ['timing: timing-diagram type with bullets', 'timing-diagram', '- signal: clk p.......\n- signal: q 0..1....', 'signal: clk p.......\nsignal: q 0..1....', 'timing'],
  ['kmap: variables key', 'kmap', 'variables: AB,CD\nminterms: 0,2,8,10', 'vars: AB,CD\nminterms: 0,2,8,10'],
  ['kmap: JSON', 'kmap', '{"vars":"AB,CD","minterms":[0,2,8,10]}', 'vars: AB,CD\nminterms: 0, 2, 8, 10'],
  ['kmap: karnaugh-map type and bracket list', 'karnaugh-map', 'vars: AB,CD\nminterms: [0, 2, 8, 10]', 'vars: AB,CD\nminterms: 0, 2, 8, 10', 'kmap'],
  ['sfd: unicode minus', 'sfd', 'L: 6\nsupports: pin@0,roller@6\nloads: point 12kN down@2\nV: 0 8;2 8;2 −4;6 −4\nM: 0 0;2 16;6 0\nsign: sagging+', SFD],
  ['sfd: spelt-out keys', 'sfd', 'length: 6\nsupports: pin@0,roller@6\nloads: point 12kN down@2\nshear: 0 8;2 8;2 -4;6 -4\nmoment: 0 0;2 16;6 0\nsign: sagging+', 'l: 6\nsupports: pin@0,roller@6\nloads: point 12kN down@2\nv: 0 8;2 8;2 -4;6 -4\nm: 0 0;2 16;6 0\nsign: sagging+'],
  ['sfd: no type', 'svg', SFD, SFD, 'sfd'],
  ['truss: misspelt key', 'truss', 'joints: A 0 0; B 4 0; C 2 3\nmembrs: A-B, B-C, C-A\nsupports: pin@A, roller@B\nloads: F down@C', 'joints: A 0 0; B 4 0; C 2 3\nmembers: A-B, B-C, C-A\nsupports: pin@A, roller@B\nloads: F down@C'],
  ['stack: list not indented', 'stack', 'layers:\n- top\n- middle\n- bottom', 'layers:\n  - top\n  - middle\n  - bottom'],
  ['stack: JSON', 'stack', '{"layers": ["top", "middle", "bottom"]}', 'layers: top\nlayers: middle\nlayers: bottom'],
  ['phasor: plural vectors and suffixed type', 'phasor-diagram', 'vectors: V 10∠0, I 2∠-30', 'vec: V 10∠0\nvec: I 2∠-30', 'phasor'],
  ['mohr: spelt-out stresses', 'mohr', 'sigma_x: 40\nsigma_y: 10\ntau_xy: 8', 'sx: 40\nsy: 10\ntxy: 8'],
  ['vsepr: spelt-out keys', 'vsepr', 'geometry: AX3E\ncentral_atom: N\nligands: H,H,H', 'geom: AX3E\ncenter: N\nligands: H,H,H'],
  ['newman: fence and bold', 'newman', '```\n**front**: CH3,H,H\n**back**: CH3,H,H\n**deg**: 180\n```', 'front: CH3,H,H\nback: CH3,H,H\ndeg: 180'],
  ['gantt: tasks key and suffixed type', 'gantt-chart', 'tasks: J1 0 3; J2 3 2; J1 5 1', 'jobs: J1 0 3; J2 3 2; J1 5 1', 'gantt'],
  ['hash: size key', 'hash', 'size: 4\nbuckets: 0: k0; 2: k1, k2', 'm: 4\nbuckets: 0: k0; 2: k1, k2'],
  ['array: values key', 'array', 'values: a0,a1,a2;b0,b1', 'cells: a0,a1,a2;b0,b1'],
  ['list: linked-list type with a bracket list', 'linked-list', 'nodes: [v0, v1, v2]', 'nodes: v0\nnodes: v1\nnodes: v2', 'list'],
  ['gel: bullets and trailing semicolons', 'gel', '- lanes: control,sample;\n- bands: control:800,control:200,sample:800,sample:100;', 'lanes: control,sample\nbands: control:800,control:200,sample:800,sample:100'],
  ['fischer: equals separators', 'fischer', 'backbone = CHO,C,CH2OH\nleft = H\nright = OH', 'backbone: CHO,C,CH2OH\nleft: H\nright: OH'],
  ['splitting: multiplicity key', 'splitting', 'multiplicity: t\nj: 7 Hz', 'mult: t\nj: 7 Hz'],
  ['timing: misspelt type', 'timng', 'signal: clk p.......\nsignal: q 0..1....', 'signal: clk p.......\nsignal: q 0..1....', 'timing'],
  ['mohr: type with a suffix', 'mohr-circle', 'sx: 40\nsy: 10\ntxy: 8', 'sx: 40\nsy: 10\ntxy: 8', 'mohr'],
];

export const REPAIRABLE: RepairCase[] = [...PLOT, ...GRAPH, ...TABLE, ...SCENE, ...CIRCUIT, ...TEMPLATES]
  .map(([name, type, content, expect, expectType]) => ({ name, type, content, expect, expectType }));

type Refusal = [name: string, type: string, content: string, why: string, keeps?: string[]];

const REFUSALS: Refusal[] = [
  ['plot: a y-range the engine cannot draw', 'plot', 'fn: x^2\ndomain: -2 2\nymax: 10', 'ymax is content with no key', ['ymax: 10']],
  ['plot: piecewise condition', 'plot', 'fn: x^2 if x > 0\ndomain: -2 2', 'not an expression', ['x^2 if x > 0']],
  ['plot: two unknown symbols', 'plot', 'fn: a*x^2 + b\ndomain: -2 2', 'a and b have no value', ['a*x^2 + b']],
  ['plot: x = constant is not a function of x', 'plot', 'x = 2\ndomain: -2 2', 'vertical line', ['x = 2']],
  ['plot: descending range', 'plot', 'fn: x\ndomain: 3 to -3', 'bounds are not increasing', ['3 to -3']],
  ['plot: unbounded range', 'plot', 'fn: x\ndomain: 0 to infinity', 'no finite bound', ['0 to infinity']],
  ['plot: ambiguous product in a bare argument', 'plot', 'fn: sin x (x+1)\ndomain: 0 3', 'two readings', ['sin x (x+1)']],
  ['plot: labelled points', 'plot', 'fn: x^2\ndomain: -2 2\npoints: (1,1) A, (2,4) B', 'labels have no slot in a point record', ['(1,1) A']],
  ['plot: a real word is not a typo', 'plot', 'fn: x^2\ndomain: -2 2\nnote: vertex at the origin', 'note is content', ['note: vertex at the origin']],
  ['plot: inference needs every key', 'svg', 'fn: x^2\ndomain: -1 1\nfoo: bar', 'foo is unexplained'],
  ['plot: second equation beside fn', 'plot', 'fn: x^2\ndomain: -2 2\nequation: y = 2x', 'label or second curve', ['equation: y = 2x']],
  ['graph: known family is never changed', 'graph', 'fn: x^2\ndomain: -1 1', 'a graph must not become a plot'],
  ['graph: undirected links', 'graph', 'A -- B\nB -- C', 'the engine draws arrows', ['A -- B']],
  ['graph: two-way arrow', 'graph', 'A <-> B', 'would add or drop a direction', ['A <-> B']],
  ['graph: ids with spaces', 'graph', 'Start Node -> End Node', 'ids cannot be invented', ['Start Node -> End Node']],
  ['graph: right-to-left layout', 'graph', 'node: A\nnode: B\nedge: A B\nrankdir: RL', 'no counterpart', ['rankdir: RL']],
  ['graph: note is not node', 'graph', 'note: weights in km\nnode: A\nnode: B\nedge: A B', 'a word, not a typo', ['note: weights in km']],
  ['graph: undirected flag', 'graph', 'directed: false\nnode: A\nnode: B\nedge: A B', 'cannot be drawn undirected', ['directed: false']],
  ['graph: Mermaid sequence diagram', 'mermaid', 'sequenceDiagram\n  A->>B: hello', 'not a flowchart'],
  ['graph: ambiguous bare keys', 'svg', 'nodes: A, B, C', 'many families read nodes'],
  ['table: rows alone fit two kinds', 'table', 'rows: a, b', 'matrix or punnett'],
  ['table: a tie between two keys', 'table', 'kind: matrix\nrowz: 1, 2', 'row or rows', ['rowz: 1, 2']],
  ['table: repeated rows are content', 'table', 'kind: matrix\nrow: 1, 2\nrow: 1, 2\nmood: happy', 'identical rows are two rows', ['row: 1, 2\nrow: 1, 2']],
  ['scene: angle above the horizontal', 'scene', 'kind: fbd\nbody: b\nforce: P 20 N 30° above the horizontal on b', 'left or right is not stated', ['30° above the horizontal']],
  ['scene: angle without a reference', 'scene', 'kind: fbd\nbody: b\nforce: P 20 N at 30° on b', 'no reference axis', ['at 30°']],
  ['scene: forces without directions', 'scene', 'kind: fbd\nbody: b\nforces: push, pull', 'no direction to draw', ['forces: push, pull']],
  ['scene: two-letter key typo', 'scene', 'kind: ray\nfo: 10\ndo: 20\nho: 5', 'short keys are never guessed', ['fo: 10']],
  ['scene: mixed variants', 'scene', 'body: block\npoint: A 0 0', 'no single variant reads these'],
  ['circuit: prose that starts like a designator', 'circuit', 'V1: a 0 5\nR1: a 0 1k\nR2 is the load resistor', 'a sentence, not a device', ['R2 is the load resistor']],
  ['circuit: unsupported device', 'circuit', 'V1: a 0 5\nX1: a 0 opamp', 'designators are not guessed', ['X1: a 0 opamp']],
  ['circuit: component without a designator', 'circuit', 'V1: a 0 5\nresistor: a 0 1k', 'an id would be invented', ['resistor: a 0 1k']],
  ['truss: a physical width is not styling', 'truss', 'joints: A 0 0; B 4 0; C 2 3\nmembers: A-B, B-C, C-A\nsupports: pin@A, roller@B\nloads: F down@C\nwidth: 5 m', 'content the family cannot draw', ['width: 5 m']],
  ['lewis: a refused family stays refused', 'lewis', 'atoms: H, O, H', 'the catalog refuses it'],
  ['json: an unknown member abandons the rewrite', 'plot', '{"fn": "x^2", "domain": [-2, 2], "ylim": [0, 4]}', 'ylim is content with no key', ['"ylim": [0, 4]']],
  ['smiles: a bracket atom is not a list', 'chem.smiles', 'smiles: [NH4+]\nfoo: 1', 'brackets are part of the value', ['smiles: [NH4+]']],
];

export const UNTOUCHABLE: UntouchableCase[] = REFUSALS.map(([name, type, content, why, keeps]) => ({ name, type, content, why, keeps }));
