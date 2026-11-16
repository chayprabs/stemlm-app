/**
 * Spelling helpers for keys and type tokens: separator/case folding and a bounded
 * Damerau-Levenshtein distance. Everything here is linear or bounded-quadratic in short strings.
 */

/** Longer tokens are never compared: no real key or family token comes close. */
export const MAX_TOKEN_CHARS = 48;

/**
 * Fold a key to its comparison form: `x_label`, `x-label`, `xLabel`, `X Label` -> `xlabel`.
 * A parenthesised argument (`f(x)`) is not part of the name.
 */
export function foldKey(key: string): string {
  return key
    .slice(0, MAX_TOKEN_CHARS)
    .replace(/\([^()]*\)\s*$/, '')
    .replace(/[\s_.\-]+/g, '')
    .toLowerCase();
}

/** Fold a type token: lowercase, with spaces, underscores and dots as hyphens (`Truth Table` -> `truth-table`). */
export function foldType(token: string): string {
  return token
    .slice(0, MAX_TOKEN_CHARS)
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Optimal-string-alignment distance (insert, delete, substitute, adjacent transposition),
 * abandoned as soon as it must exceed `max`. Returns `max + 1` when it does.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  if (a.length > MAX_TOKEN_CHARS || b.length > MAX_TOKEN_CHARS) return max + 1;
  let twoBack: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, twoBack[j - 2]! + 1);
      current.push(value);
      if (value < best) best = value;
    }
    if (best > max) return max + 1;
    twoBack = previous;
    previous = current;
  }
  const distance = previous[b.length]!;
  return distance > max ? max + 1 : distance;
}

/**
 * Edits tolerated for a token of this length. Tokens of one or two characters are never guessed:
 * every neighbour of `f`, `do` or `sx` is another plausible key.
 */
export function editBudget(length: number): number {
  if (length <= 2) return 0;
  if (length <= 5) return 1;
  if (length <= 9) return 2;
  return 3;
}

/**
 * The single target whose spelling is within the edit budget of `token`, or undefined when there
 * is none or when two different targets are equally close (ambiguity is never resolved by guessing).
 * `candidates` maps a folded spelling to the target it stands for.
 */
export function closestTarget(token: string, candidates: ReadonlyMap<string, string>): string | undefined {
  const budget = editBudget(token.length);
  if (!budget) return undefined;
  let best = budget + 1;
  let target: string | undefined;
  let tied = false;
  for (const [spelling, value] of candidates) {
    // A short spelling absorbs any short typo; the budget follows the shorter of the two.
    const allowed = Math.min(budget, editBudget(spelling.length));
    if (!allowed) continue;
    const distance = editDistance(token, spelling, Math.min(allowed, best));
    if (distance > allowed) continue;
    if (distance < best) {
      best = distance;
      target = value;
      tied = false;
    } else if (distance === best && value !== target) {
      tied = true;
    }
  }
  return tied ? undefined : target;
}
