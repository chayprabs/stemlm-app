import type { FamilyManifest } from '../types';

export const CS_MANIFESTS: FamilyManifest[] = [
  {
    token: 'sequence',
    aliases: ['sequence-diagram', 'seq', 'message-sequence'],
    requiredAny: ['msg', 'reply'],
    keys: ['actor', 'msg', 'reply', 'note'],
    subjects: ['CS'],
    grammar: 'sequence: messages between actors over time. actor: <id> [label] (repeat, left to right) | msg: <from> <to> <text> (solid arrow) | reply: <from> <to> <text> (dashed arrow) | note: <actor> <text>. Lines run top to bottom in the order written',
    specimen: 'actor: c Client\nactor: s Server\nmsg: c s GET /users\nnote: s validates token\nreply: s c 200 OK',
  },
  {
    token: 'truth',
    aliases: ['truth-table', 'truthtable'],
    required: ['expr'],
    keys: ['expr', 'inputs', 'show'],
    subjects: ['CS', 'Electrical', 'Math'],
    grammar: "truth: a truth table worked out from an expression. expr: F = A·B + C' (repeat for more output columns; AND OR NOT NAND NOR XOR XNOR, · + ' ⊕, and AB means A·B) | inputs: A, B, C (column order; at most 4) | show: minterms|maxterms|both. Never type the rows",
    specimen: "expr: F = A·B + C'\nshow: minterms",
  },
  {
    token: 'logic',
    aliases: ['logic-circuit', 'gates', 'logic-gates', 'gate'],
    required: ['expr'],
    keys: ['expr', 'std', 'inputs'],
    subjects: ['CS', 'Electrical'],
    grammar: "logic: a gate circuit worked out from an expression. expr: F = (A AND B) OR NOT C (repeat for more outputs; AND OR NOT NAND NOR XOR XNOR, · + ' ⊕) | std: ansi|iec | inputs: A, B, C (order of the input terminals)",
    specimen: 'expr: F = (A AND B) OR NOT C',
  },
  {
    token: 'tree',
    aliases: ['binary-tree', 'bst', 'heap', 'btree'],
    requiredAny: ['values', 'insert', 'node'],
    keys: ['kind', 'values', 'insert', 'heap', 'node', 'path', 'traversal'],
    subjects: ['CS', 'Math'],
    grammar: 'tree: a binary tree, search tree, heap or general tree. kind: binary|bst|heap|nary | values: 8, 3, 10, null, 6 (level order, null for a gap; for a heap, its array) | insert: 8, 3, 10 (bst: built in this order) | heap: min|max | node: <parent> <child> <child> (nary; repeat, the first parent is the root) | highlight: 6, 3 | path: 8, 3, 6 | traversal: inorder|preorder|postorder|level (worked out)',
    specimen: 'kind: bst\ninsert: 8, 3, 10, 1, 6, 14\npath: 8, 3, 6\ntraversal: inorder',
  },
];
