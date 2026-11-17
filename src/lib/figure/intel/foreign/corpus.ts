/**
 * Foreign-notation corpus: snippets written the way chat models write them, each with the exact
 * native spec it must become, and snippets that must be refused with the reason.
 * Driven by foreign.test.ts, which also compiles every translation with the real compiler.
 */
export interface TranslatedCase {
  name: string;
  /** Fence info string. */
  lang: string;
  code: string;
  /** Native `type=`. */
  type: string;
  /** Exact native spec. */
  content: string;
  caption?: string;
  notes: string[];
}

export interface RefusedCase {
  name: string;
  lang: string;
  code: string;
  /** The refusal reason, or null when the source is not a foreign notation at all. */
  reason: string | null;
}

const r = String.raw;

export const TRANSLATED: TranslatedCase[] = [
  {
    name: "flow: decision and terminal",
    lang: "mermaid",
    code: r`graph TD
    A[Start] --> B{Is x > 0?}
    B -->|Yes| C[Print positive]
    B -->|No| D[Print non-positive]
    C --> E([End])
    D --> E`,
    type: "graph",
    content: r`rankdir: TB
node: A Start
node: B Is x > 0?
node: C Print positive
node: D Print non-positive
node: E End
edge: A B
edge: B C Yes
edge: B D No
edge: C E
edge: D E
decision: B
terminal: E`,
    notes: [],
  },
  {
    name: "flow: chains and fan-out",
    lang: "mermaid",
    code: r`flowchart LR
  A --> B --> C
  A --> D & E --> F`,
    type: "graph",
    content: r`rankdir: LR
node: A
node: B
node: C
node: D
node: E
node: F
edge: A B
edge: B C
edge: A D
edge: A E
edge: D F
edge: E F`,
    notes: [],
  },
  {
    name: "flow: text on links",
    lang: "mermaid",
    code: r`graph LR;
  A -- yes --> B;
  A -. maybe .-> C;
  B == strong ==> D;
  C --ok--> D;`,
    type: "graph",
    content: r`rankdir: LR
node: A
node: B
node: C
node: D
edge: A B yes
edge: A C maybe
edge: B D strong
edge: C D ok`,
    notes: [
      "dotted line drawn as a regular arrow",
      "thick line drawn as a regular arrow",
    ],
  },
  {
    name: "flow: subgraphs, styling, directive, comments",
    lang: "mermaid",
    code: r`%%{init: {'theme':'dark'}}%%
flowchart TB
  %% a comment
  subgraph Frontend
    direction LR
    UI["User Interface (React)"] --> API[API client]
  end
  subgraph db [Data layer]
    S[(Database)]
  end
  API --> S
  classDef hot fill:#f96
  class UI hot
  style S fill:#bbf,stroke:#333
  linkStyle 0 stroke:#f00
  click UI "https://example.com"`,
    type: "graph",
    content: r`rankdir: TB
node: UI User Interface (React)
node: API API client
node: S Database
edge: UI API
edge: API S`,
    notes: [
      "renderer directive ignored",
      "subgraph \"Frontend\" flattened: its nodes are drawn without the group box",
      "subgraph direction ignored",
      "subgraph \"Data layer\" flattened: its nodes are drawn without the group box",
      "styling ignored",
      "click handler ignored",
      "cylinder outline drawn as a box",
    ],
  },
  {
    name: "flow: bottom-to-top",
    lang: "mermaid",
    code: r`graph BT
  leaf1 --> root
  leaf2 --> root`,
    type: "graph",
    content: r`rankdir: TB
node: leaf1
node: root
node: leaf2
edge: leaf1 root
edge: leaf2 root`,
    notes: [
      "bottom-to-top layout drawn top-to-bottom; every arrow keeps its source and target",
    ],
  },
  {
    name: "flow: right-to-left",
    lang: "mermaid",
    code: r`flowchart RL
  Product --> Intermediate --> Reactant`,
    type: "graph",
    content: r`rankdir: LR
node: Product
node: Intermediate
node: Reactant
edge: Product Intermediate
edge: Intermediate Reactant`,
    notes: [
      "right-to-left layout drawn left-to-right; every arrow keeps its source and target",
    ],
  },
  {
    name: "flow: entities, breaks, subscripts",
    lang: "mermaid",
    code: r`graph TD
  A["x &lt; y #quot;ok#quot; &amp; z #35;1"] --> B[Line one<br/>line two]
  B --> C[H<sub>2</sub>O and x<sup>2</sup>]`,
    type: "graph",
    content: r`rankdir: TB
node: A x < y "ok" & z #1
node: B Line one line two
node: C H_{2}O and x^{2}
edge: A B
edge: B C`,
    notes: [
      "line breaks inside labels became spaces: the figure engine wraps labels itself",
    ],
  },
  {
    name: "flow: automaton drawn with circles",
    lang: "mermaid",
    code: r`graph LR
  q0((q0)) -->|a| q1((q1))
  q1 -->|b| q2(((q2)))
  q2 -->|a| q0`,
    type: "graph",
    content: r`rankdir: LR
node: q0
node: q1
node: q2
edge: q0 q1 a
edge: q1 q2 b
edge: q2 q0 a
accept: q2`,
    notes: [],
  },
  {
    name: "flow: two-way link",
    lang: "mermaid",
    code: r`graph LR
  Client <--> Server
  Server <-->|sync| Replica`,
    type: "graph",
    content: r`rankdir: LR
node: Client
node: Server
node: Replica
edge: Client Server
edge: Server Client
edge: Server Replica sync
edge: Replica Server sync`,
    notes: [],
  },
  {
    name: "flow: every node shape",
    lang: "mermaid",
    code: r`flowchart TD
  A>Flag] --> B[[Subroutine]]
  B --> C[(Disk)]
  C --> D{{Prepare}}
  D --> E[/Read n/]
  E --> F[\Write n\]
  F --> G(Rounded)
  G --> H((Hub))`,
    type: "graph",
    content: r`rankdir: TB
node: A Flag
node: B Subroutine
node: C Disk
node: D Prepare
node: E Read n
node: F Write n
node: G Rounded
node: H Hub
edge: A B
edge: B C
edge: C D
edge: D E
edge: E F
edge: F G
edge: G H`,
    notes: [
      "flag outline drawn as a box",
      "subroutine outline drawn as a box",
      "cylinder outline drawn as a box",
      "hexagon outline drawn as a box",
      "parallelogram outline drawn as a box",
      "circle outline drawn as a box",
    ],
  },
  {
    name: "flow: brackets inside labels",
    lang: "mermaid",
    code: r`graph TD
  A["f(x) = [a, b]"] --> B[arr[i] > 0]
  B --> C(g(x))
  C --> D{Is x in {1, 2}?}`,
    type: "graph",
    content: r`rankdir: TB
node: A f(x) = [a, b]
node: B arr[i] > 0
node: C g(x)
node: D Is x in {1, 2}?
edge: A B
edge: B C
edge: C D
decision: D`,
    notes: [],
  },
  {
    name: "flow: one line with semicolons",
    lang: "mermaid",
    code: r`graph TD; A-->B; B-->C; C-->A;`,
    type: "graph",
    content: r`rankdir: TB
node: A
node: B
node: C
edge: A B
edge: B C
edge: C A`,
    notes: [],
  },
  {
    name: "flow: no direction",
    lang: "mermaid",
    code: r`flowchart
  Start --> Stop`,
    type: "graph",
    content: r`rankdir: TB
node: Start
node: Stop
edge: Start Stop`,
    notes: [],
  },
  {
    name: "flow: names that are not legal ids",
    lang: "mermaid",
    code: r`graph LR
  "Node A" --> "Node B"
  "Node B" --> état
  état --> x.y-z`,
    type: "graph",
    content: r`rankdir: LR
node: n1 Node A
node: n2 Node B
node: état
node: x.y-z
edge: n1 n2
edge: n2 état
edge: état x.y-z`,
    notes: [],
  },
  {
    name: "flow: class suffix",
    lang: "mermaid",
    code: r`graph TD
  A[Hot]:::warm --> B:::cold
  classDef warm fill:#f00;
  classDef cold fill:#00f;`,
    type: "graph",
    content: r`rankdir: TB
node: A Hot
node: B
edge: A B`,
    notes: [
      "styling ignored",
    ],
  },
  {
    name: "flow: markdown string label",
    lang: "mermaid",
    code: "graph TD\n  A[\"`**Bold** start`\"] --> B[\"`_slow_ path`\"]",
    type: "graph",
    content: r`rankdir: TB
node: A Bold start
node: B slow path
edge: A B`,
    notes: [],
  },
  {
    name: "flow: quoted edge text",
    lang: "mermaid",
    code: r`graph TD
  A -->|"x > 0"| B
  A -- "x <= 0" --> C`,
    type: "graph",
    content: r`rankdir: TB
node: A
node: B
node: C
edge: A B x > 0
edge: A C x <= 0`,
    notes: [],
  },
  {
    name: "flow: label that is itself quoted",
    lang: "mermaid",
    code: r`graph LR
  A['a'] -->|'b'| B`,
    type: "graph",
    content: r`rankdir: LR
node: A "'a'"
node: B
edge: A B "'b'"`,
    notes: [],
  },
  {
    name: "flow: long, dotted and invisible links",
    lang: "mermaid",
    code: r`graph TD
  A ---> B
  B -..-> C
  A ~~~ C
  C ====> D`,
    type: "graph",
    content: r`rankdir: TB
node: A
node: B
node: C
node: D
edge: A B
edge: B C
edge: C D`,
    notes: [
      "dotted line drawn as a regular arrow",
      "invisible layout link ignored",
      "thick line drawn as a regular arrow",
    ],
  },
  {
    name: "flow: front-matter title",
    lang: "mermaid",
    code: r`---
title: Water cycle
---
flowchart LR
  Evaporation --> Condensation --> Precipitation --> Evaporation`,
    type: "graph",
    content: r`rankdir: LR
node: Evaporation
node: Condensation
node: Precipitation
edge: Evaporation Condensation
edge: Condensation Precipitation
edge: Precipitation Evaporation`,
    caption: "Water cycle",
    notes: [],
  },
  {
    name: "flow: statements without a header",
    lang: "mermaid",
    code: r`A[Read] --> B[Eval]
B --> C[Print]
C --> A`,
    type: "graph",
    content: r`rankdir: TB
node: A Read
node: B Eval
node: C Print
edge: A B
edge: B C
edge: C A`,
    notes: [
      "no diagram type given: read as a top-down flowchart",
    ],
  },
  {
    name: "flow: keyword-like ids and trailing comment",
    lang: "mermaid",
    code: r`graph LR
  endNode --> class1 %% not keywords
  class1 --> styleGuide`,
    type: "graph",
    content: r`rankdir: LR
node: endNode
node: class1
node: styleGuide
edge: endNode class1
edge: class1 styleGuide`,
    notes: [],
  },
  {
    name: "flow: statistics test choice",
    lang: "mermaid",
    code: r`graph TD
  A[Collect data] --> B{Normal?}
  B -->|yes| C[t-test]
  B -->|no| D[Mann-Whitney]`,
    type: "graph",
    content: r`rankdir: TB
node: A Collect data
node: B Normal?
node: C t-test
node: D Mann-Whitney
edge: A B
edge: B C yes
edge: B D no
decision: B`,
    notes: [],
  },
  {
    name: "flow: quadratic roots",
    lang: "mermaid",
    code: r`graph TD
    A[Start] --> B[/Read a, b, c/]
    B --> C["Compute D = b^2 - 4ac"]
    C --> D{D > 0?}
    D -->|Yes| E[Two distinct real roots]
    D -->|No| F{D = 0?}
    F -->|Yes| G[One repeated real root]
    F -->|No| H[Two complex roots]
    E --> I[End]
    G --> I
    H --> I`,
    type: "graph",
    content: r`rankdir: TB
node: A Start
node: B Read a, b, c
node: C Compute D = b^2 - 4ac
node: D D > 0?
node: E Two distinct real roots
node: F D = 0?
node: G One repeated real root
node: H Two complex roots
node: I End
edge: A B
edge: B C
edge: C D
edge: D E Yes
edge: D F No
edge: F G Yes
edge: F H No
edge: E I
edge: G I
edge: H I
decision: D, F`,
    notes: [
      "parallelogram outline drawn as a box",
    ],
  },
  {
    name: "flow: old arrow direction and ampersand groups",
    lang: "mermaid",
    code: r`graph >
  a & b --> c`,
    type: "graph",
    content: r`rankdir: LR
node: a
node: b
node: c
edge: a c
edge: b c`,
    notes: [],
  },
  {
    name: "state: lifecycle",
    lang: "mermaid",
    code: r`stateDiagram-v2
    [*] --> Idle
    Idle --> Running : start
    Running --> Paused : pause
    Paused --> Running : resume
    Running --> Done : finish
    Done --> [*]`,
    type: "graph",
    content: r`rankdir: TB
node: Idle
node: Running
node: Paused
node: Done
edge: Idle Running start
edge: Running Paused pause
edge: Paused Running resume
edge: Running Done finish
start: Idle
accept: Done`,
    notes: [],
  },
  {
    name: "state: alias, choice, direction",
    lang: "mermaid",
    code: r`stateDiagram
  direction LR
  state "Waiting for input" as W
  state C <<choice>>
  [*] --> W
  W --> C : key
  C --> W : invalid
  C --> Ok : valid
  Ok --> [*]`,
    type: "graph",
    content: r`rankdir: LR
node: W Waiting for input
node: C
node: Ok
edge: W C key
edge: C W invalid
edge: C Ok valid
decision: C
start: W
accept: Ok`,
    notes: [],
  },
  {
    name: "state: DFA with self-loops",
    lang: "mermaid",
    code: r`stateDiagram-v2
    direction LR
    [*] --> q0
    q0 --> q0 : 1
    q0 --> q1 : 0
    q1 --> q1 : 0
    q1 --> q2 : 1
    q2 --> q1 : 0
    q2 --> q0 : 1
    q2 --> [*]`,
    type: "graph",
    content: r`rankdir: LR
node: q0
node: q1
node: q2
edge: q0 q0 1
edge: q0 q1 0
edge: q1 q1 0
edge: q1 q2 1
edge: q2 q1 0
edge: q2 q0 1
start: q0
accept: q2`,
    notes: [],
  },
  {
    name: "state: descriptions and styling",
    lang: "mermaid",
    code: r`stateDiagram-v2
    classDef hot fill:#f00
    s1 : Solid phase
    s2 : Liquid phase
    s1 --> s2 : melt
    s2 --> s1 : freeze
    class s1 hot`,
    type: "graph",
    content: r`rankdir: TB
node: s1 Solid phase
node: s2 Liquid phase
edge: s1 s2 melt
edge: s2 s1 freeze`,
    notes: [
      "styling ignored",
    ],
  },
  {
    name: "state: composite without its own start",
    lang: "mermaid",
    code: r`stateDiagram-v2
    [*] --> Off
    Off --> On : power
    state On {
      Idle --> Heating : cold
      Heating --> Idle : warm
    }
    On --> Off : power`,
    type: "graph",
    content: r`rankdir: TB
node: Off
node: On
node: Idle
node: Heating
edge: Off On power
edge: Idle Heating cold
edge: Heating Idle warm
edge: On Off power
start: Off`,
    notes: [
      "composite state On flattened: its substates are drawn at the top level",
    ],
  },
  {
    name: "state: two start states and no end",
    lang: "mermaid",
    code: r`stateDiagram-v2
    [*] --> A
    [*] --> B
    A --> B : x
    B --> A : y`,
    type: "graph",
    content: r`rankdir: TB
node: A
node: B
edge: A B x
edge: B A y
start: A, B`,
    notes: [],
  },
  {
    name: "state: declared state and class suffix",
    lang: "mermaid",
    code: r`stateDiagram-v2
    state Ready
    Ready:::green --> Busy : go
    Busy --> Ready`,
    type: "graph",
    content: r`rankdir: TB
node: Ready
node: Busy
edge: Ready Busy go
edge: Busy Ready`,
    notes: [],
  },
  {
    name: "sequence: request and reply",
    lang: "mermaid",
    code: r`sequenceDiagram
    participant C as Client
    participant S as Server
    C->>S: GET /index.html
    activate S
    S-->>C: 200 OK
    deactivate S
    Note over C,S: TLS handshake done
    loop Every 30 s
      C-)S: ping
    end`,
    type: "sequence",
    content: r`actor: C Client
actor: S Server
msg: C S GET /index.html
reply: S C 200 OK
note: C TLS handshake done
msg: C S ping`,
    notes: [
      "activation bars dropped",
      "note over C, S attached to C",
      "loop \"Every 30 s\" frame dropped: its messages are kept in order",
      "async arrowhead drawn as a regular arrowhead",
    ],
  },
  {
    name: "sequence: implicit participants, alt",
    lang: "mermaid",
    code: r`sequenceDiagram
    autonumber
    Alice->>+Bob: Hello Bob, how are you?
    alt is sick
        Bob-->>Alice: Not so good
    else is well
        Bob-->>-Alice: Feeling fresh
    end
    Note right of Bob: Bob thinks`,
    type: "sequence",
    content: r`actor: Alice
actor: Bob
msg: Alice Bob Hello Bob, how are you?
reply: Bob Alice Not so good
reply: Bob Alice Feeling fresh
note: Bob Bob thinks`,
    notes: [
      "message numbering dropped",
      "activation bars dropped",
      "alt \"is sick\" frame dropped: its messages are kept in order",
      "else \"is well\" branch dropped: its messages are kept in order",
    ],
  },
  {
    name: "sequence: names with spaces, actor, title",
    lang: "mermaid",
    code: r`sequenceDiagram
    title: Checkout
    actor U as End user
    participant Web App
    U->>Web App: click "Buy"
    Web App->>Payment API: charge(card)
    Payment API--xWeb App: timeout
    Web App->Web App: retry`,
    type: "sequence",
    content: r`actor: U End user
actor: p1 Web App
actor: p2 Payment API
msg: U p1 click "Buy"
msg: p1 p2 charge(card)
reply: p2 p1 timeout
msg: p1 p1 retry`,
    caption: "Checkout",
    notes: [
      "stick-figure actor drawn as a participant",
      "async arrowhead drawn as a regular arrowhead",
      "arrowless message line drawn with an arrowhead",
    ],
  },
  {
    name: "sequence: parallel frames and self message",
    lang: "mermaid",
    code: r`sequenceDiagram
    par to B
      A->>B: x
    and to C
      A->>C: y
    end
    opt cached
      B->>B: reuse
    end`,
    type: "sequence",
    content: r`actor: A
actor: B
actor: C
msg: A B x
msg: A C y
msg: B B reuse`,
    notes: [
      "par \"to B\" frame dropped: its messages are kept in order",
      "and \"to C\" branch dropped: its messages are kept in order",
      "opt \"cached\" frame dropped: its messages are kept in order",
    ],
  },
  {
    name: "pie: title on the header",
    lang: "mermaid",
    code: r`pie title Composition of air
    "Nitrogen" : 78
    "Oxygen" : 21
    "Other" : 1`,
    type: "chart",
    content: r`kind: pie
title: Composition of air
labels: Nitrogen, Oxygen, Other
values: 78, 21, 1`,
    notes: [],
  },
  {
    name: "pie: showData and decimals",
    lang: "mermaid",
    code: r`pie showData
    title Key elements in Product X
    "Calcium" : 42.96
    "Potassium" : 50.05
    "Magnesium" : 10.01
    "Iron" :  5`,
    type: "chart",
    content: r`kind: pie
title: Key elements in Product X
labels: Calcium, Potassium, Magnesium, Iron
values: 42.96, 50.05, 10.01, 5`,
    notes: [
      "showData (values in the legend) ignored",
    ],
  },
  {
    name: "pie: unquoted labels",
    lang: "mermaid",
    code: r`pie
  Dogs : 386
  Cats : 85
  Rats : 15`,
    type: "chart",
    content: r`kind: pie
labels: Dogs, Cats, Rats
values: 386, 85, 15`,
    notes: [],
  },
  {
    name: "gantt: CPU schedule on plain numbers",
    lang: "mermaid",
    code: r`gantt
    title FCFS Scheduling
    dateFormat X
    axisFormat %s
    section CPU
    P1 :0, 5
    P2 :5, 8
    P3 :8, 16`,
    type: "gantt",
    content: r`jobs: P1 0 5; P2 5 3; P3 8 8
label: FCFS Scheduling`,
    notes: [
      "axis formatting ignored",
      "section \"CPU\" heading dropped",
    ],
  },
  {
    name: "gantt: ids, after and durations",
    lang: "mermaid",
    code: r`gantt
    dateFormat X
    P1 :p1, 0, 3s
    P2 :p2, after p1, 4s
    P3 :2s`,
    type: "gantt",
    content: r`jobs: P1 0 3; P2 3 4; P3 7 2`,
    notes: [],
  },
  {
    name: "class: hierarchy and relations",
    lang: "mermaid",
    code: r`classDiagram
    Animal <|-- Dog
    Animal <|-- Cat
    Shape <|.. Circle
    Car *-- Engine
    Owner --> Car : drives`,
    type: "graph",
    content: r`rankdir: LR
node: Animal
node: Dog
node: Cat
node: Shape
node: Circle
node: Car
node: Engine
node: Owner
edge: Dog Animal extends
edge: Cat Animal extends
edge: Circle Shape implements
edge: Car Engine composed of
edge: Owner Car drives`,
    notes: [
      "UML <|-- arrow written as \"extends\"",
      "UML <|.. arrow written as \"implements\"",
      "UML *-- arrow written as \"composed of\"",
    ],
  },
  {
    name: "class: stereotype, generics, direction",
    lang: "mermaid",
    code: r`classDiagram
    direction TB
    class Shape
    <<interface>> Shape
    class List~T~
    Circle ..|> Shape
    List~T~ o-- Shape
    Renderer ..> Shape`,
    type: "graph",
    content: r`rankdir: TB
node: Shape «interface» Shape
node: List List<T>
node: Circle
node: Renderer
edge: Circle Shape implements
edge: List Shape aggregates
edge: Renderer Shape depends on`,
    notes: [
      "UML ..|> arrow written as \"implements\"",
      "UML o-- arrow written as \"aggregates\"",
      "UML ..> arrow written as \"depends on\"",
    ],
  },
  {
    name: "mindmap: tree by indentation",
    lang: "mermaid",
    code: r`mindmap
  root((Cell))
    Nucleus
      DNA
    Cytoplasm
      Ribosomes
      Mitochondria`,
    type: "graph",
    content: r`rankdir: TB
node: n1 Cell
node: n2 Nucleus
node: n3 DNA
node: n4 Cytoplasm
node: n5 Ribosomes
node: n6 Mitochondria
edge: n1 n2
edge: n2 n3
edge: n1 n4
edge: n4 n5
edge: n4 n6`,
    notes: [
      "mind map drawn as a tree: each branch is an arrow from parent to child",
    ],
  },
  {
    name: "mindmap: shapes, icons, repeated text",
    lang: "mermaid",
    code: r`mindmap
  Forces
    [Contact]
      Friction
      ::icon(fa fa-book)
    (Field)
      Gravity
      Friction`,
    type: "graph",
    content: r`rankdir: TB
node: n1 Forces
node: n2 Contact
node: n3 Friction
node: n4 Field
node: n5 Gravity
node: n6 Friction
edge: n1 n2
edge: n2 n3
edge: n1 n4
edge: n4 n5
edge: n4 n6`,
    notes: [
      "icons and styling ignored",
      "mind map drawn as a tree: each branch is an arrow from parent to child",
    ],
  },
  {
    name: "dot: DFA with a point start",
    lang: "dot",
    code: r`digraph DFA {
  rankdir=LR;
  node [shape=point]; start;
  node [shape=circle];
  q2 [shape=doublecircle];
  start -> q0;
  q0 -> q1 [label="0"];
  q0 -> q0 [label="1"];
  q1 -> q2 [label="1"];
  q2 -> q2 [label="0,1"];
}`,
    type: "graph",
    content: r`rankdir: LR
node: q2
node: q0
node: q1
edge: q0 q1 0
edge: q0 q0 1
edge: q1 q2 1
edge: q2 q2 0,1
start: q0
accept: q2`,
    notes: [],
  },
  {
    name: "dot: flowchart with a cluster",
    lang: "graphviz",
    code: r`digraph G {
  // flowchart
  node [shape=box, style=filled, fillcolor=lightblue];
  start [label="Start"];
  check [label="n <= 1?", shape=diamond];
  ret [label="return 1"];
  rec [label=<n &times; f(n-1)>];
  start -> check;
  check -> ret [label="yes"];
  check -> rec [label="no"];
  subgraph cluster_0 { label="Recursion"; rec -> check [style=dashed]; }
}`,
    type: "graph",
    content: r`rankdir: TB
node: start Start
node: check n <= 1?
node: ret return 1
node: rec n × f(n-1)
edge: start check
edge: check ret yes
edge: check rec no
edge: rec check
decision: check`,
    notes: [
      "cluster \"Recursion\" flattened: its nodes are drawn without the group box",
      "styling attributes ignored",
      "dashed line drawn as a regular arrow",
    ],
  },
  {
    name: "dot: quoted ids and a subgraph endpoint",
    lang: "dot",
    code: r`digraph { "Glucose" -> "Pyruvate" -> "Acetyl CoA"; "Acetyl CoA" -> {"Citrate" "Fatty acids"} }`,
    type: "graph",
    content: r`rankdir: TB
node: Glucose
node: Pyruvate
node: n1 Acetyl CoA
node: Citrate
node: n2 Fatty acids
edge: Glucose Pyruvate
edge: Pyruvate n1
edge: n1 Citrate
edge: n1 n2`,
    notes: [],
  },
  {
    name: "dot: binary search tree",
    lang: "dot",
    code: r`digraph BST {
    node [shape=circle];
    50 -> 30;
    50 -> 70;
    30 -> 20;
    30 -> 40;
}`,
    type: "graph",
    content: r`rankdir: TB
node: 50
node: 30
node: 70
node: 20
node: 40
edge: 50 30
edge: 50 70
edge: 30 20
edge: 30 40`,
    notes: [
      "circle outline drawn as a box",
    ],
  },
  {
    name: "dot: weighted digraph",
    lang: "gv",
    code: r`digraph G {
  rankdir=LR;
  A -> B [label="4"];
  A -> C [label=2];
  C -> B [label="1", weight=3, color=red];
}`,
    type: "graph",
    content: r`rankdir: LR
node: A
node: B
node: C
edge: A B 4
edge: A C 2
edge: C B 1`,
    notes: [
      "styling attributes ignored",
    ],
  },
  {
    name: "dot: strict, comments, title",
    lang: "dot",
    code: r`/* a pathway */
strict digraph pathway {
  label = "Citric acid cycle (part)";
  # preprocessor-style comment
  Citrate -> Isocitrate;
  Citrate -> Isocitrate [label="aconitase"];
  Isocitrate -> "alpha-Ketoglutarate";
}`,
    type: "graph",
    content: r`rankdir: TB
node: Citrate
node: Isocitrate
node: alpha-Ketoglutarate
edge: Citrate Isocitrate aconitase
edge: Isocitrate alpha-Ketoglutarate`,
    caption: "Citric acid cycle (part)",
    notes: [],
  },
  {
    name: "dot: html labels and line breaks",
    lang: "dot",
    code: r`digraph {
  a [label=<<B>Step 1</B><BR/>mix>];
  b [label="Step 2\nheat to 80 &deg;C"];
  c [label=<H<SUB>2</SUB>O>];
  a -> b -> c;
}`,
    type: "graph",
    content: r`rankdir: TB
node: a Step 1 mix
node: b Step 2 heat to 80 °C
node: c H_{2}O
edge: a b
edge: b c`,
    notes: [
      "line breaks inside labels became spaces: the figure engine wraps labels itself",
    ],
  },
  {
    name: "dot: dir=back and dir=both",
    lang: "dot",
    code: r`digraph {
  parent -> child [dir=back];
  a -> b [dir=both, label="sync"];
}`,
    type: "graph",
    content: r`rankdir: TB
node: parent
node: child
node: a
node: b
edge: child parent
edge: a b sync
edge: b a sync`,
    notes: [],
  },
  {
    name: "dot: ports and name escape",
    lang: "dot",
    code: r`digraph {
  n1 [label="\N (root)"];
  n1:s -> n2:n;
  n2 -> n3:w;
}`,
    type: "graph",
    content: r`rankdir: TB
node: n1 n1 (root)
node: n2
node: n3
edge: n1 n2
edge: n2 n3`,
    notes: [],
  },
  {
    name: "dot: peripheries and start word",
    lang: "dot",
    code: r`digraph {
  rankdir=LR;
  "" [shape=none];
  "" -> s0 [label="start"];
  s0 -> s1 [label="a"];
  s1 [peripheries=2];
}`,
    type: "graph",
    content: r`rankdir: LR
node: s0
node: s1
edge: s0 s1 a
start: s0
accept: s1`,
    notes: [
      "the word on the start arrow is dropped: the entry arrow itself marks the start",
    ],
  },
  {
    name: "dot: bottom-to-top and scoped defaults",
    lang: "dot",
    code: r`digraph deps {
  rankdir=BT;
  subgraph { node [shape=diamond]; choose; }
  app -> lib;
  lib -> choose;
}`,
    type: "graph",
    content: r`rankdir: TB
node: choose
node: app
node: lib
edge: app lib
edge: lib choose
decision: choose`,
    notes: [
      "bottom-to-top layout drawn top-to-bottom; every arrow keeps its source and target",
    ],
  },
  {
    name: "dot: string concatenation and invisible edge",
    lang: "dot",
    code: r`digraph {
  a [label="Sodium " + "chloride"];
  a -> b;
  b -> c [style=invis];
}`,
    type: "graph",
    content: r`rankdir: TB
node: a Sodium chloride
node: b
node: c
edge: a b`,
    notes: [
      "invisible layout edge ignored",
    ],
  },
  {
    name: "dot: flowchart with decision",
    lang: "dot",
    code: r`digraph factorial {
  node [shape=box];
  start [label="Start", shape=oval];
  cond [label="i <= n?", shape=diamond];
  body [label="result = result * i"];
  start -> cond;
  cond -> body [label="true"];
  body -> cond;
  cond -> done [label="false"];
}`,
    type: "graph",
    content: r`rankdir: TB
node: start Start
node: cond i <= n?
node: body result = result * i
node: done
edge: start cond
edge: cond body true
edge: body cond
edge: cond done false
decision: cond`,
    notes: [
      "oval outline drawn as a box",
    ],
  },
  {
    name: "dot: sniffed from an unlabelled fence",
    lang: "",
    code: r`digraph G { a -> b; b -> c; }`,
    type: "graph",
    content: r`rankdir: TB
node: a
node: b
node: c
edge: a b
edge: b c`,
    notes: [],
  },
  {
    name: "table: formatting stripped, math kept",
    lang: "markdown",
    code: "| Quantity | Symbol | Unit |\n|---|:-:|--:|\n| Force | $F$ | N |\n| **Mass** | `m` | kg |\n| Acceleration | $a$ | m/s^2 |",
    type: "table",
    content: r`kind: matrix
headers: Quantity, Symbol, Unit
row: Force, $F$, N
row: Mass, m, kg
row: Acceleration, $a$, m/s^2`,
    notes: [],
  },
  {
    name: "table: cells with commas",
    lang: "",
    code: r`| Set | Elements |
|-----|----------|
| A | 1, 2, 3 |
| B | 2, 4 |`,
    type: "table",
    content: r`kind: matrix
headers: Set; Elements
row: A; 1, 2, 3
row: B; 2, 4`,
    notes: [],
  },
  {
    name: "table: short rows padded with blanks",
    lang: "md",
    code: r`|  | Acid | Base |
|---|---|---|
| Strong | HCl | NaOH |
| Weak | CH3COOH |`,
    type: "table",
    content: r`kind: matrix
headers: , Acid, Base
row: Strong, HCl, NaOH
row: Weak, CH3COOH,`,
    notes: [],
  },
  {
    name: "table: grid without a header",
    lang: "",
    code: r`| 1 | 0 | 0 |
| 0 | 1 | 0 |
| 0 | 0 | 1 |`,
    type: "table",
    content: r`kind: matrix
row: 1, 0, 0
row: 0, 1, 0
row: 0, 0, 1`,
    notes: [],
  },
  {
    name: "table: no outer pipes, links, entities, breaks",
    lang: "markdown",
    code: r`Law | Statement
--- | ---
[First](https://example.com/1) | A body stays at rest&hellip;
Second | *F* = *ma*<br>net force
snake_case | 2 * 3 * 4`,
    type: "table",
    content: r`kind: matrix
headers: Law, Statement
row: First, A body stays at rest…
row: Second, F = ma net force
row: snake_case, 2 * 3 * 4`,
    notes: [],
  },
  {
    name: "table: pipe inside math",
    lang: "md",
    code: r`| Expression | Meaning |
|---|---|
| $|x|$ | absolute value |
| $a \mid b$ | divides |`,
    type: "table",
    content: r`kind: matrix
headers: Expression, Meaning
row: $\vert x\vert$, absolute value
row: $a \mid b$, divides`,
    notes: [],
  },
  {
    name: "table: semicolons in comma mode",
    lang: "markdown",
    code: r`| Step | Code |
|---|---|
| 1 | x = 0; y = 1 |
| 2 | return x |`,
    type: "table",
    content: r`kind: matrix
headers: Step, Code
row: 1, x = 0; y = 1
row: 2, return x`,
    notes: [],
  },
  {
    name: "table: truth table",
    lang: "table",
    code: r`| A | B | A AND B |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 0 |
| 1 | 1 | 1 |`,
    type: "table",
    content: r`kind: matrix
headers: A, B, A AND B
row: 0, 0, 0
row: 0, 1, 0
row: 1, 1, 1`,
    notes: [],
  },
  {
    name: "arrows: pathway",
    lang: "text",
    code: r`Glucose -> Pyruvate -> Acetyl CoA
Acetyl CoA -> Citrate`,
    type: "graph",
    content: r`rankdir: LR
node: Glucose
node: Pyruvate
node: n1 Acetyl CoA
node: Citrate
edge: Glucose Pyruvate
edge: Pyruvate n1
edge: n1 Citrate`,
    notes: [],
  },
  {
    name: "arrows: weights and trailing label",
    lang: "",
    code: r`A --5--> B
B --3--> C
A -> C: 10
C <-> D`,
    type: "graph",
    content: r`rankdir: LR
node: A
node: B
node: C
node: D
edge: A B 5
edge: B C 3
edge: A C 10
edge: C D
edge: D C`,
    notes: [
      "two-way arrow drawn as two arrows",
    ],
  },
  {
    name: "arrows: unicode arrows and bullets",
    lang: "txt",
    code: r`- Sun → Grass → Rabbit
- Rabbit → Fox
- Fox ← Hunter`,
    type: "graph",
    content: r`rankdir: LR
node: Sun
node: Grass
node: Rabbit
node: Fox
node: Hunter
edge: Sun Grass
edge: Grass Rabbit
edge: Rabbit Fox
edge: Hunter Fox`,
    notes: [],
  },
  {
    name: "arrows: double arrows and quoted names",
    lang: "plain",
    code: r`"Solid" => "Liquid"
"Liquid" => "Gas"
Gas ==condense==> Liquid`,
    type: "graph",
    content: r`rankdir: LR
node: Solid
node: Liquid
node: Gas
edge: Solid Liquid
edge: Liquid Gas
edge: Gas Liquid condense`,
    notes: [],
  },
  {
    name: "arrows: hyphenated names",
    lang: "",
    code: r`well-known fact -> lemma
lemma -x-> theorem`,
    type: "graph",
    content: r`rankdir: LR
node: n1 well-known fact
node: lemma
node: theorem
edge: n1 lemma
edge: lemma theorem x`,
    notes: [],
  },
];

export const REFUSED: RefusedCase[] = [
  { name: "flow: undirected links", lang: "mermaid", code: r`graph TD
  A --- B
  B --- C`, reason: "undirected links cannot be drawn without inventing a direction" },
  { name: "flow: circle-ended link", lang: "mermaid", code: r`graph TD
  A --o B`, reason: "circle- and cross-ended links carry a meaning the graph cannot draw" },
  { name: "flow: cross-ended link", lang: "mermaid", code: r`graph TD
  A --x B`, reason: "circle- and cross-ended links carry a meaning the graph cannot draw" },
  { name: "flow: link to a subgraph", lang: "mermaid", code: r`graph TD
  subgraph one
    a --> b
  end
  one --> c`, reason: "a link to a whole subgraph cannot be drawn" },
  { name: "flow: unclosed label", lang: "mermaid", code: r`graph TD
  A[Start --> B`, reason: "a node label is not closed" },
  { name: "flow: trailing garbage", lang: "mermaid", code: r`graph TD
  A --> B ??? C`, reason: "a flowchart statement has text the parser cannot read" },
  { name: "flow: empty label", lang: "mermaid", code: r`graph TD
  A[" "] --> B`, reason: "a node has an empty label" },
  { name: "flow: image in a label", lang: "mermaid", code: r`graph TD
  A["<img src='x.png'/> Logo"] --> B`, reason: "a label holds HTML structure that has no plain-text form" },
  { name: "flow: new shape syntax", lang: "mermaid", code: r`flowchart TD
  A@{ shape: diamond, label: "Check" } --> B`, reason: "the @{ } shape syntax is not supported" },
  { name: "flow: plain node the engine would draw as a diamond", lang: "mermaid", code: r`flowchart LR
  A[Input] --> B[Store entity relationship]`, reason: "the graph engine would draw this plain node as a decision diamond because of a word in its name" },
  { name: "state: composite with its own start", lang: "mermaid", code: r`stateDiagram-v2
  [*] --> Active
  state Active {
    [*] --> Idle
    Idle --> Busy
  }`, reason: "a composite state with its own start or end cannot be flattened faithfully" },
  { name: "state: note", lang: "mermaid", code: r`stateDiagram-v2
  [*] --> A
  note right of A : important`, reason: "state notes have no native form" },
  { name: "state: fork", lang: "mermaid", code: r`stateDiagram-v2
  state f <<fork>>
  [*] --> f
  f --> A
  f --> B`, reason: "fork and join bars have no native form" },
  { name: "state: labelled start", lang: "mermaid", code: r`stateDiagram-v2
  [*] --> A : boot
  A --> B`, reason: "a labelled start or end transition has no native form" },
  { name: "sequence: two-way message", lang: "mermaid", code: r`sequenceDiagram
  A<<->>B: handshake`, reason: "two-way messages have no native form" },
  { name: "sequence: created participant", lang: "mermaid", code: r`sequenceDiagram
  A->>B: hi
  create participant C
  B->>C: spawn`, reason: "participant creation and destruction have no native form" },
  { name: "pie: label with a comma", lang: "mermaid", code: r`pie
  "Fe, Co, Ni" : 3
  "Other" : 1`, reason: "a pie label cannot be written in a comma-separated list" },
  { name: "gantt: calendar dates", lang: "mermaid", code: r`gantt
    title Project
    dateFormat YYYY-MM-DD
    section Design
    Draft :a1, 2024-01-01, 30d`, reason: "a gantt task start cannot be read" },
  { name: "class: members", lang: "mermaid", code: r`classDiagram
    class Animal {
      +String name
      +makeSound()
    }
    Animal <|-- Dog`, reason: "class members have no native form" },
  { name: "class: multiplicities", lang: "mermaid", code: r`classDiagram
    Customer "1" --> "*" Order : places`, reason: "relation multiplicities have no native form" },
  { name: "er diagram", lang: "mermaid", code: r`erDiagram
    CUSTOMER ||--o{ ORDER : places`, reason: "entity attributes and crow-foot cardinalities have no native form" },
  { name: "git graph", lang: "mermaid", code: r`gitGraph
  commit
  branch dev
  commit`, reason: "branch lanes and merges have no native form" },
  { name: "journey", lang: "mermaid", code: r`journey
  title My day
  section Work
    Code: 5: Me`, reason: "scored journey steps have no native form" },
  { name: "timeline", lang: "mermaid", code: r`timeline
  title History
  2004 : Facebook`, reason: "a period-and-events timeline has no native form" },
  { name: "mindmap: two roots", lang: "mermaid", code: r`mindmap
  A
  B`, reason: "a mind map has one root" },
  { name: "dot: undirected graph", lang: "dot", code: r`graph G { a -- b; b -- c; }`, reason: "undirected links cannot be drawn without inventing a direction" },
  { name: "dot: record node", lang: "dot", code: r`digraph { n [shape=record, label="{a|b|c}"]; n -> m; }`, reason: "record nodes have no native form" },
  { name: "dot: point node used as a junction", lang: "dot", code: r`digraph { j [shape=point]; a -> j; j -> b; }`, reason: "an invisible or point node inside the graph cannot be drawn" },
  { name: "dot: inhibition arrowhead", lang: "dot", code: r`digraph { a -> b [arrowhead=tee]; }`, reason: "special arrowheads carry a meaning the graph cannot draw" },
  { name: "dot: head label", lang: "dot", code: r`digraph { a -> b [headlabel="1"]; }`, reason: "edge end labels and cluster edges have no native form" },
  { name: "dot: unclosed", lang: "dot", code: r`digraph { a -> b`, reason: "the DOT source is missing }" },
  { name: "dot: html table label", lang: "dot", code: r`digraph { a [label=<<TABLE><TR><TD>x</TD></TR></TABLE>>]; a -> b; }`, reason: "a label holds HTML structure that has no plain-text form" },
  { name: "table: row longer than the header", lang: "markdown", code: r`| a | b |
|---|---|
| 1 | 2 | 3 |`, reason: "a row has more cells than the header" },
  { name: "table: prose around the table", lang: "", code: r`Results:
| a | b |
|---|---|
| 1 | 2 |`, reason: null },
  { name: "table: commas and semicolons together", lang: "md", code: r`| a | b |
|---|---|
| 1, 2 | x; y |`, reason: "cells with commas cannot be written as a native row here" },
  { name: "table: literal pipe", lang: "md", code: r`| op | meaning |
|---|---|
| a \| b | or |`, reason: "a cell holds a literal pipe, which the table engine refuses" },
  { name: "arrows: C code", lang: "", code: r`p->next = q->next
q->next = p`, reason: "an arrow is not set off by spaces" },
  { name: "arrows: lambdas", lang: "", code: r`a => a + 1
b => b * 2`, reason: "unconnected arrows are not a diagram" },
  { name: "arrows: a line without an arrow", lang: "text", code: r`A -> B
B and C are related`, reason: null },
  { name: "arrows: colon in a source name", lang: "text", code: r`Step 1: Init -> Step 2: Run
Step 2: Run -> Step 3: Stop`, reason: "a colon in a source name is ambiguous" },
  { name: "unrelated code fence", lang: "python", code: r`print("a -> b")`, reason: null },
];
