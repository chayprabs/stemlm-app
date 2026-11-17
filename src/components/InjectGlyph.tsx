/**
 * The composer control's glyphs, and nothing else: the welcome page draws the control from here
 * without taking the content script's controller with it.
 */

/** The therefore-mark at glyph size: two premises on the baseline, the conclusion above them. */
const MARK_SHAPES = (
  <>
    <circle className="slm-inject-dot" cx="5.4" cy="17.4" r="3.3" />
    <circle className="slm-inject-dot" cx="18.6" cy="17.4" r="3.3" />
    <rect className="slm-inject-apex" x="8.6" y="3.2" width="6.8" height="6.8" rx="2.05" />
  </>
);

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** While the control is at work the three shapes rise in turn. */
export function InjectSpinner() {
  return (
    <svg className="slm-inject-spinner" width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
      {MARK_SHAPES}
    </svg>
  );
}

/** The mark at rest; a tick once stemlm is on for the question; a stop mark when it could not be. */
export function InjectGlyph({ attached, failed = false }: { attached: boolean; failed?: boolean }) {
  return (
    <span className={`slm-inject-glyph ${failed ? 'is-alert' : attached ? 'is-tick' : 'is-mark'}`} aria-hidden="true">
      <svg className="slm-inject-mark" viewBox="0 0 24 24" width={18} height={18}>
        {MARK_SHAPES}
      </svg>
      <svg className="slm-inject-tick" viewBox="0 0 24 24" width={18} height={18}>
        <path d="M19.5 6.5 9.6 17 4.5 11.9" {...STROKE} />
      </svg>
      <svg className="slm-inject-alert" viewBox="0 0 24 24" width={18} height={18}>
        <path d="M12 5.2v8.2M12 18.4v.2" {...STROKE} />
      </svg>
    </span>
  );
}
