import type { FamilyManifest } from '../types';

export const CS_MANIFESTS: FamilyManifest[] = [
  {
    token: 'sequence',
    aliases: ['sequence-diagram', 'seq', 'message-sequence'],
    requiredAny: ['msg', 'reply'],
    keys: ['actor', 'msg', 'reply', 'note'],
    subjects: ['CS'],
    grammar: 'sequence: actor: <id> [label] (repeat, left to right) | msg: <from> <to> <text> (solid) | reply: <from> <to> <text> (dashed) | note: <actor> <text>; lines run top to bottom in source order',
    specimen: 'actor: c Client\nactor: s Server\nmsg: c s GET /users\nnote: s validates token\nreply: s c 200 OK',
  },
  {
    token: 'truth',
    aliases: ['truth-table', 'truthtable'],
    required: ['expr'],
    keys: ['expr', 'inputs', 'show'],
    subjects: ['CS', 'Electrical', 'Math'],
    grammar: "truth: expr: [F =] <Boolean expression> (repeat = one output column each; AND OR NOT NAND NOR XOR XNOR, · + ' ⊕, AB = A·B) | inputs: A, B, C (column order, default alphabetical, max 4) | show: minterms|maxterms|both; every row is computed",
    specimen: "expr: F = A·B + C'\nshow: minterms",
  },
  {
    token: 'logic',
    aliases: ['logic-circuit', 'gates', 'logic-gates', 'gate'],
    required: ['expr'],
    keys: ['expr', 'std', 'inputs'],
    subjects: ['CS', 'Electrical'],
    grammar: "logic: expr: [F =] <Boolean expression> (repeat = one output each; the gate network is derived: AND OR NOT NAND NOR XOR XNOR, · + ' ⊕, AB = A·B, A·B·C = one 3-input gate) | std: ansi|iec | inputs: A, B, C (terminal order)",
    specimen: 'expr: F = (A AND B) OR NOT C',
  },
  {
    token: 'tree',
    aliases: ['binary-tree', 'bst', 'heap', 'btree'],
    requiredAny: ['values', 'insert', 'node'],
    keys: ['kind', 'values', 'insert', 'heap', 'node', 'path', 'traversal'],
    subjects: ['CS', 'Math'],
    grammar: 'tree: kind: binary|bst|heap|nary | values: 8, 3, 10, null, 6 (level order, null = hole; heap: its array) | insert: 8, 3, 10 (bst, built in this order) | heap: min|max (checked) | node: <parent> <child> … (nary, repeat; first parent is the root) | highlight: 6, 3 | path: 8, 3, 6 | traversal: inorder|preorder|postorder|level (computed)',
    specimen: 'kind: bst\ninsert: 8, 3, 10, 1, 6, 14\npath: 8, 3, 6\ntraversal: inorder',
  },
];
