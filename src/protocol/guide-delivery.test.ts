import { describe, expect, it } from 'vitest';
import { assembleProtocolFile } from './protocol';
import { buildComposerStub, PROTOCOL_FILENAME, composerTextHasProtocol } from './builder';
import { createTextFile, PROTOCOL_ATTACHMENT_NAME } from '@/src/lib/file-inject';

describe('student study guide attachment', () => {
  it('uses a plain stable filename shared by the composer and uploader', () => {
    expect(PROTOCOL_FILENAME).toBe('stemLM Guide.txt');
    expect(PROTOCOL_ATTACHMENT_NAME).toBe(PROTOCOL_FILENAME);
    expect(createTextFile('reference', PROTOCOL_FILENAME).name).toBe('stemLM Guide.txt');
  });

  it('identifies the reference before any answer-format directives', () => {
    const content = assembleProtocolFile();
    expect(content.startsWith('stemLM Study Guide\n')).toBe(true);
    expect(content.slice(0, 600)).toContain('This guide is not a homework question.');
    expect(content.slice(0, 600)).toContain('If no question is supplied, wait for the student');
    expect(content).not.toContain('Now produce the capsule.');
  });

  it('scopes the student-facing reference to formatting the student question', () => {
    const stub = buildComposerStub('Explain inertia.');
    expect(stub).toContain('Follow the attached stemLM study guide');
    expect(stub).toContain('as an answer-format reference');
    expect(stub).toContain('Explain inertia.');
    expect(stub).not.toContain('protocol');
    expect(stub).not.toContain('.txt');
  });

  it('still recognizes previously sent attachments', () => {
    expect(composerTextHasProtocol('Follow the attached stemlm-protocol.txt')).toBe(true);
    expect(composerTextHasProtocol('1789247745212_stemlm-protocol.txt')).toBe(true);
  });
});
