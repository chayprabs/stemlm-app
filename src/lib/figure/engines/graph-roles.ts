/**
 * Roles the graph engine reads off a node's wording. Kept apart from the engine (and free of its
 * layout dependencies) because the Mermaid/DOT translator asks the same question: would the engine
 * reshape a node the source drew as a plain box?
 */
export type NodeRole = 'resource' | 'process' | 'relation' | 'entity' | 'node';

export function inferNodeKind(id: string, label: string): NodeRole {
  const text = `${id} ${label}`;
  if (/\b(resource|lock|mutex|semaphore)\b/i.test(text)) return 'resource';
  if (/\b(process|thread|worker|task|actor)\b/i.test(text)) return 'process';
  if (/\b(relation|relationship)\b/i.test(text)) return 'relation';
  if (/\b(entity)\b/i.test(text)) return 'entity';
  return 'node';
}

const ROLE_PAIRS: NodeRole[][] = [['process', 'resource'], ['entity', 'relation']];

/**
 * Whether a worded role is drawn with its own shape.
 *
 * A role is the drawing convention of two diagram classes: wait-for graphs pair processes with
 * resources, ER diagrams pair entities with relations. A single such word in a flowchart ("Check
 * relationship", "Start process") is prose, and reshaping its box into a diamond or an ellipse
 * would draw a decision or a terminal the source never declared. So a role holds only when every
 * node has one or its counterpart is present, and never beside shapes the author declared
 * (decision, terminal, start, accept).
 */
export function roleHolds(role: NodeRole, allRoles: readonly NodeRole[], declaredShapes: boolean): boolean {
  if (role === 'node' || declaredShapes) return false;
  const pair = ROLE_PAIRS.find((candidate) => candidate.includes(role))!;
  return allRoles.every((other) => other !== 'node') || pair.every((member) => allRoles.includes(member));
}
