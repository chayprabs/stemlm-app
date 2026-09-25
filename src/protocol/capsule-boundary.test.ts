import { describe, expect, it } from 'vitest';
import { FENCED_ELECTRICAL } from './__fixtures__';
import { findCapsuleRaw, looksComplete, parse, parseCapsule } from './parser';

const body = FENCED_ELECTRICAL.replace(/^```stemlm\n/, '').replace(/\n```$/, '');

describe('capsule closing fence recovery', () => {
  it.each(['@end```', '@end ````', '  @end\t```  \r'])('recovers extracted code ending in %s without changing its content', (ending) => {
    const text = body.replace(/@end$/, ending);
    expect(looksComplete(text)).toBe(true);
    expect(findCapsuleRaw(text)).toBe(body);
    for (const result of [parse(text), parseCapsule(text)]) {
      expect(result.capsule).toEqual(parseCapsule(body).capsule);
      expect(result.warningCodes).not.toContain('missing_end');
      expect(result.warningCodes).not.toContain('inner_triple_backticks');
    }
  });

  it.each(['```stemlm\n', '```text\n', ''])('recovers closing fences with opening wrapper %j', (opening) => {
    expect(parse(opening + body + '```').capsule).toEqual(parse(body).capsule);
    expect(looksComplete(opening + body + '```')).toBe(true);
  });

  it.each(['```@end', '```` @end', '  ```\t@end  \r', '```@end```'])('PARSE-03 recovers a closing fence glued before the end marker: %j', (ending) => {
    for (const opening of ['```stemlm\n', '```text\n', '']) {
      const text = opening + body.replace(/@end$/, ending);
      expect(looksComplete(text), opening).toBe(true);
      expect(findCapsuleRaw(text), opening).toBe(body);
      expect(parse(text).capsule, opening).toEqual(parseCapsule(body).capsule);
      expect(parse(text).warningCodes, opening).not.toContain('missing_end');
    }
  });

  it('PARSE-03 still treats a two-backtick or prose-prefixed end marker as incomplete', () => {
    for (const ending of ['``@end', 'Example ```@end', '```@endsolution']) {
      const text = body.replace(/@end$/, ending);
      expect(looksComplete(text), ending).toBe(false);
      expect(parse(text).warningCodes, ending).toContain('missing_end');
    }
  });

  it('keeps incomplete endings and literal end-token prose incomplete', () => {
    for (const ending of ['', '```', '@end`', '@end``', '@end```unfinished', 'Example: @end```', '@endsolution```']) {
      const text = body.replace(/@end$/, ending);
      expect(looksComplete(text), ending).toBe(false);
      expect(parse(text).warningCodes, ending).toContain('missing_end');
    }
  });
});
