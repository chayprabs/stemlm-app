/** Remove copy artefacts at marker boundaries without altering prose or marker attributes. */
export function normalizeMarkerLine(line: string): string {
  const normalized = line.replace(/^[\s\u200B-\u200D\u2060]*(@[a-z]+)[\u200B-\u200D\u2060]*(?=\s|$|`)/i, '$1');
  return normalized.startsWith('@') ? normalized.replace(/[\u200B-\u200D\u2060]+\s*$/, '') : line;
}

/** A provider may leave its closing Markdown fence attached to either side of the end marker. */
export function isCapsuleEndLine(line: string): boolean {
  const trimmed = line.trim();
  const marker = trimmed.startsWith('`') ? trimmed.replace(/^`{3,}[\t ]*/, '') : normalizeMarkerLine(line).trim();
  return /^@end(?:[\t ]*`{3,})?$/.test(marker);
}
