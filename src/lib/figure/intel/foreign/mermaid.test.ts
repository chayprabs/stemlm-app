import { describe, expect, it } from 'vitest';
import { Refusal } from './native';
import { mermaidHeader, translateMermaid } from './mermaid';

const spec = (source: string) => translateMermaid(source, true).content;
const reason = (source: string): string => {
  try {
    translateMermaid(source, true);
  } catch (error) {
    if (error instanceof Refusal) return error.reason;
    throw error;
  }
  return 'translated';
};

describe('mermaidHeader', () => {
  it('names the diagram type past fences, front matter, directives and comments', () => {
    expect(mermaidHeader('```mermaid\n%% c\n%%{init: {}}%%\nflowchart LR\n A --> B\n```')).toBe('flowchart');
    expect(mermaidHeader('---\ntitle: T\n---\nstateDiagram-v2\n [*] --> A')).toBe('statediagram-v2');
    expect(mermaidHeader('sequenceDiagram')).toBe('sequencediagram');
  });

  it('is null for Graphviz, native specs and prose', () => {
    for (const source of ['graph G { a -- b }', 'digraph { a -> b }', 'node: A\nedge: A B', 'kind: pie', 'pie in the sky', 'graph of f(x)', '', '%%{']) {
      expect(mermaidHeader(source)).toBeNull();
    }
  });
});

describe('flowchart grammar', () => {
  it('reads link text that starts with o or x as text, and a lone o or x as a head', () => {
    expect(spec('graph LR\n A --ok--> B\n B --x1--> C')).toBe('rankdir: LR\nnode: A\nnode: B\nnode: C\nedge: A B ok\nedge: B C x1');
    expect(reason('graph LR\n A --o B')).toMatch(/circle- and cross-ended/);
    expect(reason('graph LR\n A x--x B')).toMatch(/circle- and cross-ended/);
  });

  it('keeps open links undirected, so they are refused rather than given an arrowhead', () => {
    for (const link of ['---', '-.-', '===', '-- text ---', '---|text|']) {
      expect(reason(`graph TD\n A ${link} B`)).toBe('undirected links cannot be drawn without inventing a direction');
    }
  });

  it('expands groups to every pair, in source order', () => {
    expect(spec('graph TD\n A & B --> C & D')).toBe('rankdir: TB\nnode: A\nnode: B\nnode: C\nnode: D\nedge: A C\nedge: A D\nedge: B C\nedge: B D');
  });

  it('lets the last definition of a node win and keeps the first position', () => {
    expect(spec('graph TD\n A[first] --> B\n A{second}')).toBe('rankdir: TB\nnode: A second\nnode: B\nedge: A B\ndecision: A');
  });

  it('treats a keyword followed by a link as a node name', () => {
    expect(spec('graph TD\n style --> end1\n class & click --> end1')).toBe(
      'rankdir: TB\nnode: style\nnode: end1\nnode: class\nnode: click\nedge: style end1\nedge: class end1\nedge: click end1',
    );
  });

  it('never interprets or truncates a label', () => {
    expect(spec('graph TD\n A["  if (a<b and c>d) then \\neq  "]')).toBe('rankdir: TB\nnode: A if (a<b and c>d) then \\neq');
    expect(spec('graph TD\n A["List<T> & Map"] --> B["\\"q\\""]')).toContain('node: A List<T> & Map');
    expect(reason(`graph TD\n A[${'long '.repeat(80)}]`)).toBe('a label is too long to draw');
  });

  it('refuses the one edge label the engine would silently drop', () => {
    expect(reason('graph TD\n A -->|flow| B')).toBe('the edge label "flow" cannot be drawn');
    expect(spec('graph TD\n A -->|data flow| B')).toContain('edge: A B data flow');
  });

  it('refuses unbalanced structure', () => {
    expect(reason('graph TD\n subgraph x\n A --> B')).toBe('a subgraph is not closed');
    expect(reason('graph TD\n A --> B\n end')).toBe('end without a subgraph');
    expect(reason('graph TD\n A -- text')).toBe('a link label is not closed');
    expect(reason('graph TD\n A -->|text B')).toBe('a link label is not closed');
    expect(reason('%%{init\ngraph TD\n A --> B')).toBe('a directive is not closed');
  });
});

describe('state diagrams', () => {
  it('marks start and accepting states and keeps transition labels verbatim', () => {
    expect(spec('stateDiagram-v2\n [*] --> S0\n S0 --> S1 : a / push(x)\n S1 --> [*]')).toBe(
      'rankdir: TB\nnode: S0\nnode: S1\nedge: S0 S1 a / push(x)\nstart: S0\naccept: S1',
    );
  });

  it('refuses scoped pseudo-states, notes, concurrency and conflicting names', () => {
    expect(reason('stateDiagram-v2\n state X {\n  A --> [*]\n }')).toMatch(/composite state with its own start or end/);
    expect(reason('stateDiagram-v2\n A --> B\n note left of A\n  text\n end note')).toBe('state notes have no native form');
    expect(reason('stateDiagram-v2\n state X {\n  A --> B\n  --\n  C --> D\n }')).toBe('concurrent regions have no native form');
    expect(reason('stateDiagram-v2\n state "One" as A\n A : Two\n A --> B')).toBe('a state has both an alias and a description');
    expect(reason('stateDiagram-v2\n [*] --> [*]')).toMatch(/\[\*\] to \[\*\]/);
    expect(reason('stateDiagram-v2\n state X {\n A --> B')).toBe('a composite state is not closed');
  });
});

describe('sequence, pie, gantt, class, mind map', () => {
  it('refuses a message without text and a participant that cannot be read', () => {
    expect(reason('sequenceDiagram\n A->>B:')).toBe('a message has no text');
    expect(reason('sequenceDiagram\n A->>B')).toBe('a message has no text');
    expect(reason('sequenceDiagram\n loop x\n A->>B: hi')).toBe('a frame is not closed');
    expect(reason('sequenceDiagram\n participant A')).toBe('the sequence has no messages');
  });

  it('keeps hyphenated participant names whole', () => {
    expect(spec('sequenceDiagram\n Front-End->>Back-End: call\n Back-End-->>Front-End: done')).toBe(
      'actor: Front-End\nactor: Back-End\nmsg: Front-End Back-End call\nreply: Back-End Front-End done',
    );
  });

  it('refuses pie values that are not non-negative numbers', () => {
    expect(reason('pie\n "A" : -1')).toBe('a pie value is not a non-negative number');
    expect(reason('pie\n "A" : many')).toBe('a pie value is not a non-negative number');
    expect(reason('pie title Empty')).toBe('the pie has no slices');
  });

  it('maps a gantt chart only when it is on plain numbers with one-word tasks', () => {
    expect(reason('gantt\n dateFormat X\n Task one :0, 4')).toBe('a gantt task name must be one word natively');
    expect(reason('gantt\n P1 :0, 4')).toMatch(/only dateFormat X/);
    expect(reason('gantt\n dateFormat X\n P1 :crit, 0, 4')).toBe('task status tags have no native form');
    expect(reason('gantt\n dateFormat X\n section A\n P1 :0, 4\n section B\n P2 :4, 6')).toBe('gantt sections have no native form');
    expect(reason('gantt\n dateFormat X\n P1 :4, 4')).toBe('a gantt task needs a positive duration');
  });

  it('translates class relations to words and refuses what a node cannot hold', () => {
    expect(spec('classDiagram\n A --|> B\n C --* D\n E <.. F')).toBe(
      'rankdir: LR\nnode: A\nnode: B\nnode: C\nnode: D\nnode: E\nnode: F\nedge: A B extends\nedge: D C composed of\nedge: F E depends on',
    );
    expect(reason('classDiagram\n A -- B')).toBe('undirected links cannot be drawn without inventing a direction');
    expect(reason('classDiagram\n A <|-- B : is a')).toBe('a typed relation with its own label has no native form');
    expect(reason('classDiagram\n A : +int x')).toBe('class members have no native form');
    expect(reason('classDiagram\n note "hello"')).toBe('a class statement cannot be read');
  });

  it('names the unsupported diagram types', () => {
    for (const header of ['erDiagram', 'gitGraph', 'journey', 'timeline', 'quadrantChart', 'xychart-beta', 'sankey-beta', 'requirementDiagram', 'C4Context', 'block-beta', 'kanban']) {
      expect(reason(`${header}\n x`)).not.toBe('translated');
    }
  });
});
