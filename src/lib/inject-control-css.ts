/**
 * The composer control's look, in one place.
 *
 * The control is drawn in two worlds: docked in the chat page's own DOM (inside the composer
 * slot), and, when the composer cannot be found, fixed inside stemLM's shadow root. Each world
 * needs the rules under its own scope, so the stylesheet is generated rather than written twice.
 *
 * The control shows the therefore-mark, not a plus: every host already has a plus that opens its
 * own attach menu, and two of them side by side cannot be told apart.
 */
export const INJECT_SIGNAL = '#ff6b2c';
export const INJECT_SIZE_PX = 32;
export const INJECT_RADIUS = '10px';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * @param scope selector prefix ending in a space (`'[data-stemlm-composer-slot] '`), or `''`
 * @param schemeSelector how this world marks the host page's light/dark scheme on an ancestor
 */
export function injectControlCss(
  scope: string,
  schemeSelector: (scheme: 'light' | 'dark') => string,
): string {
  const s = scope;
  const light = schemeSelector('light');
  const dark = schemeSelector('dark');
  return `
${s}.slm-fab-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  pointer-events: auto;
}
${s}.slm-inject-btn {
  --slm-inject-ink: #16161a;
  --slm-inject-surface: rgba(255, 255, 255, 0.96);
  --slm-inject-line: rgba(22, 22, 26, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  height: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  padding: 0;
  margin: 0;
  border: 1px solid var(--slm-inject-line);
  border-radius: ${INJECT_RADIUS};
  background: var(--slm-inject-surface);
  color: var(--slm-inject-ink);
  cursor: pointer;
  box-sizing: border-box;
  overflow: visible;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: background 0.2s ${EASE}, border-color 0.2s ${EASE}, box-shadow 0.2s ${EASE},
    transform 0.16s ${EASE};
}
${dark} .slm-inject-btn {
  --slm-inject-ink: #f2f2f2;
  --slm-inject-surface: rgba(34, 34, 36, 0.92);
  --slm-inject-line: rgba(255, 255, 255, 0.16);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}
${light} .slm-inject-btn {
  --slm-inject-ink: #16161a;
  --slm-inject-surface: rgba(255, 255, 255, 0.96);
  --slm-inject-line: rgba(22, 22, 26, 0.16);
}
${s}.slm-inject-btn:hover {
  border-color: ${INJECT_SIGNAL};
  box-shadow: 0 0 0 3px rgba(255, 107, 44, 0.16), 0 1px 2px rgba(0, 0, 0, 0.08);
}
${s}.slm-inject-btn:focus-visible {
  outline: 2px solid ${INJECT_SIGNAL};
  outline-offset: 2px;
}
${s}.slm-inject-btn:active {
  transform: scale(0.94);
}
${s}.slm-inject-btn[aria-disabled="true"] {
  cursor: wait;
}
/* Guide attached: the control is armed and says so. */
${s}.slm-inject-btn.is-attached {
  border-color: ${INJECT_SIGNAL};
  background: color-mix(in srgb, ${INJECT_SIGNAL} 14%, var(--slm-inject-surface));
  color: ${INJECT_SIGNAL};
}
/* Panel open: the control is the lit end of the panel. */
${s}.slm-inject-btn.is-panel-open {
  border-color: ${INJECT_SIGNAL};
  background: ${INJECT_SIGNAL};
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(255, 107, 44, 0.35);
}
${s}.slm-inject-glyph {
  position: relative;
  display: block;
  width: 18px;
  height: 18px;
}
${s}.slm-inject-glyph svg {
  position: absolute;
  inset: 0;
  width: 18px;
  height: 18px;
  display: block;
  overflow: visible;
  transition: opacity 0.2s ${EASE}, transform 0.26s ${EASE};
}
${s}.slm-inject-mark {
  opacity: 1;
  transform: scale(1);
}
${s}.slm-inject-mark .slm-inject-dot {
  fill: var(--slm-inject-ink);
}
${s}.slm-inject-mark .slm-inject-apex {
  fill: ${INJECT_SIGNAL};
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.26s ${EASE};
}
${s}.slm-inject-btn:hover .slm-inject-apex {
  transform: translateY(-1px) scale(1.08);
}
${s}.slm-inject-tick {
  opacity: 0;
  transform: scale(0.5) rotate(-18deg);
}
${s}.slm-inject-btn.is-attached .slm-inject-mark,
${s}.slm-inject-btn.is-panel-open .slm-inject-mark {
  opacity: 0;
  transform: scale(0.5);
}
${s}.slm-inject-btn.is-attached .slm-inject-tick,
${s}.slm-inject-btn.is-panel-open .slm-inject-tick {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}
/* Attaching: premise, premise, conclusion, in turn. */
${s}.slm-inject-spinner {
  width: 18px;
  height: 18px;
  display: block;
  overflow: visible;
}
${s}.slm-inject-spinner .slm-inject-dot {
  fill: var(--slm-inject-ink);
}
${s}.slm-inject-spinner .slm-inject-apex {
  fill: ${INJECT_SIGNAL};
}
${s}.slm-inject-spinner .slm-inject-dot,
${s}.slm-inject-spinner .slm-inject-apex {
  transform-box: fill-box;
  transform-origin: center;
  animation: slm-inject-think 0.96s ${EASE} infinite;
}
${s}.slm-inject-spinner .slm-inject-dot + .slm-inject-dot {
  animation-delay: 0.16s;
}
${s}.slm-inject-spinner .slm-inject-apex {
  animation-delay: 0.32s;
}
${s}.slm-inject-live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@keyframes slm-inject-think {
  0%, 60%, 100% { transform: translateY(0); opacity: 1; }
  30% { transform: translateY(-2.5px); opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  ${s}.slm-inject-btn,
  ${s}.slm-inject-glyph svg,
  ${s}.slm-inject-mark .slm-inject-apex {
    transition: none !important;
  }
  ${s}.slm-inject-btn:active,
  ${s}.slm-inject-btn:hover .slm-inject-apex {
    transform: none;
  }
  ${s}.slm-inject-spinner .slm-inject-dot,
  ${s}.slm-inject-spinner .slm-inject-apex {
    animation: none;
  }
}
`;
}
