import { describe, expect, it } from 'vitest';
import { assembleProtocolFile } from './protocol';
import { buildComposerStub } from './builder';
import { compileDiagramSpec } from '@/src/lib/figure/compile';
import { resolveDiagram } from '@/src/lib/resolve-diagram';

describe('attached first-pass figure contract', () => {
  it('teaches a complete physically consistent shear/moment example', async () => {
    const matches = [...assembleProtocolFile().matchAll(/@diagram id=\S+ type=sfd\n([\s\S]*?)\n@enddiagram/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(await resolveDiagram({ type: 'sfd', content: match[1]! }, 'light')).toMatchObject({ ok: true });
    }
  });

  it('documents executable forms for the repaired template capabilities', async () => {
    const file = assembleProtocolFile();
    for (const family of ['gel', 'fischer', 'oneline', 'chem.smiles']) {
      const matches = [...file.matchAll(/@diagram id=\S+ type=([^\s]+)\n([\s\S]*?)\n@enddiagram/g)]
        .filter(match => match[1] === family);
      expect(matches.length, `no executable ${family} form in attachment`).toBeGreaterThan(0);
      for (const match of matches) {
        const result = await compileDiagramSpec({ type: family, content: match[2]! });
        expect(result.ok, result.ok ? family : result.reason).toBe(true);
      }
    }
  });

  it('keeps the existing student composer request byte for byte', () => {
    expect(buildComposerStub('Explain inertia.')).toBe([
      'Explain inertia.',
      '',
      '--- stemLM ---',
      'Follow the attached stemLM study guide as an answer-format reference for my question. Infer the subject from the problem. Use its worked steps and diagram instructions.',
    ].join('\n'));
  });
});
