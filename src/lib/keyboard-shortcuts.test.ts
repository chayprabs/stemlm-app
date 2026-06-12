import { describe, expect, it } from 'vitest';
import {
  eventTargetAcceptsText,
  shortcutActionFromEvent,
  shortcutLabel,
} from './keyboard-shortcuts';

function keydown(key: string, opt: Partial<KeyboardEventInit> = {}) {
  return new KeyboardEvent('keydown', {
    key,
    ctrlKey: true,
    altKey: true,
    bubbles: true,
    cancelable: true,
    ...opt,
  });
}

describe('keyboard shortcuts', () => {
  it('maps chorded keys to stemLM actions', () => {
    expect(shortcutActionFromEvent(keydown('l'))).toBe('toggle-panel');
    expect(shortcutActionFromEvent(keydown('J'))).toBe('previous-step');
    expect(shortcutActionFromEvent(keydown('k'))).toBe('next-step');
    expect(shortcutActionFromEvent(keydown('1'))).toBe('steps-view');
    expect(shortcutActionFromEvent(keydown('2'))).toBe('solution-view');
    expect(shortcutActionFromEvent(keydown('m'))).toBe('toggle-reviewed');
    expect(shortcutActionFromEvent(keydown('t'))).toBe('toggle-theme');
    expect(shortcutActionFromEvent(keydown('s'))).toBe('toggle-save');
    expect(shortcutActionFromEvent(keydown('p'))).toBe('export-pdf');
  });

  it('ignores partial chords and repeated keydown events', () => {
    expect(shortcutActionFromEvent(keydown('l', { altKey: false }))).toBeNull();
    expect(shortcutActionFromEvent(keydown('l', { ctrlKey: false }))).toBeNull();
    expect(shortcutActionFromEvent(keydown('l', { repeat: true }))).toBeNull();
    expect(shortcutActionFromEvent(keydown('l', { metaKey: true }))).toBeNull();
  });

  it('detects editable targets so typing is left alone', () => {
    const input = document.createElement('input');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const editor = document.createElement('div');
    editor.contentEditable = 'true';

    expect(eventTargetAcceptsText(input)).toBe(true);
    expect(eventTargetAcceptsText(document.createElement('textarea'))).toBe(true);
    expect(eventTargetAcceptsText(editor)).toBe(true);
    expect(eventTargetAcceptsText(checkbox)).toBe(false);
    expect(eventTargetAcceptsText(document.createElement('button'))).toBe(false);
  });

  it('exposes labels for UI hints', () => {
    expect(shortcutLabel('toggle-panel')).toBe('Ctrl+Alt+L');
    expect(shortcutLabel('export-pdf')).toBe('Ctrl+Alt+P');
  });
});
