export type ShortcutAction =
  | 'toggle-panel'
  | 'previous-step'
  | 'next-step'
  | 'steps-view'
  | 'solution-view'
  | 'toggle-reviewed'
  | 'toggle-theme'
  | 'toggle-save'
  | 'export-pdf';

export interface KeyboardShortcut {
  action: ShortcutAction;
  label: string;
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift?: boolean;
  panelOnly?: boolean;
  requiresSession?: boolean;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { action: 'toggle-panel', label: 'Ctrl+Alt+L', key: 'l', ctrl: true, alt: true },
  {
    action: 'previous-step',
    label: 'Ctrl+Alt+J',
    key: 'j',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
  {
    action: 'next-step',
    label: 'Ctrl+Alt+K',
    key: 'k',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
  {
    action: 'steps-view',
    label: 'Ctrl+Alt+1',
    key: '1',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
  {
    action: 'solution-view',
    label: 'Ctrl+Alt+2',
    key: '2',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
  {
    action: 'toggle-reviewed',
    label: 'Ctrl+Alt+M',
    key: 'm',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
  { action: 'toggle-theme', label: 'Ctrl+Alt+T', key: 't', ctrl: true, alt: true, panelOnly: true },
  {
    action: 'toggle-save',
    label: 'Ctrl+Alt+S',
    key: 's',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
  {
    action: 'export-pdf',
    label: 'Ctrl+Alt+P',
    key: 'p',
    ctrl: true,
    alt: true,
    panelOnly: true,
    requiresSession: true,
  },
];

export function shortcutLabel(action: ShortcutAction): string {
  return KEYBOARD_SHORTCUTS.find((s) => s.action === action)?.label ?? '';
}

export function eventTargetAcceptsText(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest('[contenteditable="true"], [contenteditable="plaintext-only"]')) {
    return true;
  }
  const tag = target.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (target as HTMLInputElement).type?.toLowerCase();
  return !['button', 'checkbox', 'color', 'file', 'radio', 'range', 'reset', 'submit'].includes(type);
}

export function shouldIgnoreShortcutEvent(e: KeyboardEvent): boolean {
  if (e.repeat) return true;
  if (e.defaultPrevented) return true;
  return eventTargetAcceptsText(e.target);
}

export function shortcutActionFromEvent(e: KeyboardEvent): ShortcutAction | null {
  if (shouldIgnoreShortcutEvent(e)) return null;
  const key = e.key.toLowerCase();
  const match = KEYBOARD_SHORTCUTS.find(
    (s) =>
      s.key === key &&
      e.ctrlKey === s.ctrl &&
      e.altKey === s.alt &&
      e.shiftKey === Boolean(s.shift) &&
      !e.metaKey,
  );
  return match?.action ?? null;
}
