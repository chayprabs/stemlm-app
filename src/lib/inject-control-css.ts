/**
 * The composer control's look, in one place.
 *
 * The control lives inside someone else's interface, beside the chat's own attach button, so it
 * is drawn as that button's neighbour: no surface of its own at rest, the same size, corner and
 * ink (measured from the button and passed in as custom properties), and the wash every chat uses
 * for a hovered icon button. What is stemLM's is the glyph: the therefore-mark, not a plus, because
 * the chat's own plus sits right beside it; the signal colour marks a question stemlm is on for.
 *
 * It is drawn in stemLM's shadow root on a chat page and as a crop on the welcome page, so the
 * rules are generated under a scope rather than written twice.
 */
import { FONT_SANS } from '@/src/lib/fonts';

export const INJECT_SIGNAL = '#ff6b2c';
/** The signal as a fill under a white glyph: a shade deeper, so glyph and shape both clear 3:1. */
export const INJECT_SIGNAL_STRONG = '#f8601f';
/** Size and corner when no attach button has been measured (the welcome page's crops). */
export const INJECT_SIZE_PX = 32;
export const INJECT_RADIUS = '10px';

// The chat page has none of stemLM's tokens, so the curve and the three durations of
// assets/tokens.css (--slm-ease-out, --slm-dur-1/2/3) are written out here.
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const DUR_1 = '0.12s';
const DUR_2 = '0.18s';
const DUR_3 = '0.26s';

/**
 * @param scope selector prefix ending in a space (`'.slm-welcome '`), or `''`
 * @param schemeSelector how this world marks light or dark on the control or an ancestor
 */
export function injectControlCss(
  scope: string,
  schemeSelector: (scheme: 'light' | 'dark') => string,
): string {
  const s = scope;
  const dark = schemeSelector('dark');
  return `
${s}.slm-fab-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  height: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  pointer-events: auto;
  animation: slm-inject-in ${DUR_2} ${EASE} both;
}
${s}.slm-inject-btn {
  --slm-inject-ink: var(--slm-inject-host-ink, #16161a);
  --slm-inject-signal-ink: #c2410c;
  --slm-inject-error: #c81e1e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  height: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  padding: 0;
  margin: 0;
  border: 0;
  border-radius: var(--slm-inject-radius, ${INJECT_RADIUS});
  background: transparent;
  color: var(--slm-inject-ink);
  cursor: pointer;
  box-sizing: border-box;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background-color ${DUR_2} ${EASE}, color ${DUR_2} ${EASE}, transform ${DUR_1} ${EASE};
}
${dark} .slm-inject-btn {
  --slm-inject-ink: var(--slm-inject-host-ink, #f2f2f2);
  --slm-inject-signal-ink: #ff9466;
  --slm-inject-error: #f87171;
}
${s}.slm-inject-btn:hover {
  background: color-mix(in srgb, var(--slm-inject-ink) 9%, transparent);
}
${s}.slm-inject-btn:focus-visible {
  outline: 2px solid var(--slm-inject-ink);
  outline-offset: 2px;
}
${s}.slm-inject-btn:active {
  transform: scale(0.96);
}
${s}.slm-inject-btn[aria-disabled="true"] {
  cursor: progress;
}
/* stemlm is on for this question: the tick is the signal as ink, on a wash of it. */
${s}.slm-inject-btn.is-attached {
  background: color-mix(in srgb, ${INJECT_SIGNAL} 14%, transparent);
  color: var(--slm-inject-signal-ink);
}
${s}.slm-inject-btn.is-attached:hover {
  background: color-mix(in srgb, ${INJECT_SIGNAL} 22%, transparent);
}
/* Panel open: the control is the lit end of the panel. */
${s}.slm-inject-btn.is-panel-open,
${s}.slm-inject-btn.is-panel-open:hover {
  background: ${INJECT_SIGNAL_STRONG};
  color: #ffffff;
}
${s}.slm-inject-btn.is-error {
  background: color-mix(in srgb, var(--slm-inject-error) 12%, transparent);
  color: var(--slm-inject-error);
}
${s}.slm-inject-glyph,
${s}.slm-inject-spinner {
  --slm-inject-glyph: clamp(16px, calc(var(--slm-inject-size, ${INJECT_SIZE_PX}px) * 0.5625), 20px);
  position: relative;
  display: block;
  width: var(--slm-inject-glyph);
  height: var(--slm-inject-glyph);
  overflow: visible;
}
${s}.slm-inject-glyph svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity ${DUR_2} ${EASE}, transform ${DUR_3} ${EASE};
}
${s}.slm-inject-glyph.is-mark .slm-inject-mark,
${s}.slm-inject-glyph.is-tick .slm-inject-tick,
${s}.slm-inject-glyph.is-alert .slm-inject-alert {
  opacity: 1;
  transform: scale(1);
}
${s}.slm-inject-dot {
  fill: var(--slm-inject-ink);
}
${s}.slm-inject-apex {
  fill: ${INJECT_SIGNAL};
}
${s}.slm-inject-mark .slm-inject-apex {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform ${DUR_3} ${EASE};
}
${s}.slm-inject-btn:hover .slm-inject-mark .slm-inject-apex {
  transform: translateY(-1px);
}
/* At work: premise, premise, conclusion, in turn. The one loop. */
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
/* What the control does, said beside it: on hover after a beat, at once on focus or after a press. */
${s}.slm-inject-tip {
  --slm-inject-tip-bg: #16161a;
  --slm-inject-tip-fg: #ffffff;
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  width: max-content;
  max-width: min(280px, calc(100vw - 32px));
  padding: 5px 9px;
  border-radius: 8px;
  background: var(--slm-inject-tip-bg);
  color: var(--slm-inject-tip-fg);
  font: 500 12px/1.4 ${FONT_SANS};
  letter-spacing: 0;
  text-align: left;
  pointer-events: none;
  opacity: 0;
  transform: translateY(2px);
  transition: opacity ${DUR_1} ${EASE}, transform ${DUR_1} ${EASE};
}
${dark} .slm-inject-tip {
  --slm-inject-tip-bg: #f2f2f2;
  --slm-inject-tip-fg: #16161a;
}
${s}.slm-fab-wrap[data-tip="below"] .slm-inject-tip {
  bottom: auto;
  top: calc(100% + 8px);
}
${s}.slm-inject-btn:hover + .slm-inject-tip {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0.4s;
}
${s}.slm-inject-btn:focus-visible + .slm-inject-tip,
${s}.slm-inject-tip.is-open {
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0s;
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
@keyframes slm-inject-in {
  from { opacity: 0; }
}
@keyframes slm-inject-think {
  0%, 60%, 100% { transform: translateY(0); opacity: 1; }
  30% { transform: translateY(-2.5px); opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  ${s}.slm-inject-btn,
  ${s}.slm-inject-glyph svg,
  ${s}.slm-inject-tip,
  ${s}.slm-inject-mark .slm-inject-apex {
    transition: none !important;
  }
  ${s}.slm-inject-btn:active,
  ${s}.slm-inject-btn:hover .slm-inject-mark .slm-inject-apex {
    transform: none;
  }
  ${s}.slm-fab-wrap,
  ${s}.slm-inject-spinner .slm-inject-dot,
  ${s}.slm-inject-spinner .slm-inject-apex {
    animation: none;
  }
}
`;
}
