import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type FocusRoot = Document | ShadowRoot;

function focusRoot(element: HTMLElement): FocusRoot {
  const root = element.getRootNode();
  return root instanceof Document || root instanceof ShadowRoot ? root : document;
}

function deepActiveElement(root: FocusRoot = document): HTMLElement | null {
  let active: Element | null = root.activeElement;
  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active instanceof HTMLElement ? active : null;
}

/** Focuses a modal on entry, wraps Tab, and returns focus to its opener. */
export function useDialogFocus<T extends HTMLElement>(): React.RefObject<T | null> {
  const dialogRef = useRef<T>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = deepActiveElement();
    const modal = dialog;
    const root = focusRoot(dialog);
    const focusables = () => {
      const active = deepActiveElement(root);
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === active,
      );
    };
    const first = focusables()[0] ?? dialog;
    first.focus({ preventScroll: true });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        modal.focus({ preventScroll: true });
        return;
      }
      const current = deepActiveElement(root);
      const index = items.indexOf(current as HTMLElement);
      const next = event.shiftKey
        ? index <= 0 ? items[items.length - 1] : items[index - 1]
        : index === items.length - 1 ? items[0] : items[index + 1];
      if (index < 0 || next) {
        event.preventDefault();
        next?.focus({ preventScroll: true });
      }
    }

    modal.addEventListener('keydown', onKeyDown);
    return () => {
      modal.removeEventListener('keydown', onKeyDown);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return dialogRef;
}
