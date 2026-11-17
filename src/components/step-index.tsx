/** Geometric step-index marks 1–99. Filled numerals, not typeset digits. */
import type { SVGProps } from 'react';

const BOX = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true as const,
};

/** Single-figure glyphs, 24×24, even-odd where the digit has a counter. */
const FIGURE: Record<number, string> = {
  0: 'M12 4.55c3.2 0 5.35 2.3 5.35 7.45S15.2 19.45 12 19.45 6.65 17.15 6.65 12 8.8 4.55 12 4.55Zm0 2.3c-1.75 0-2.85 1.65-2.85 5.15s1.1 5.15 2.85 5.15 2.85-1.65 2.85-5.15-1.1-5.15-2.85-5.15Z',
  1: 'M10.2 7.55 13.55 5.2h2.15v13.55h-2.55V8.35l-2.95 1.7V7.55Z',
  2: 'M7.15 8.1c0-2.4 2.2-4.2 5.15-4.2 2.9 0 5.05 1.55 5.05 3.95 0 1.7-.85 2.9-2.55 4.25L9.55 16.6h7.55v2.2H6.85v-1.85l6.05-5.15c1.45-1.25 2-1.85 2-3.15 0-1.2-1.05-2.05-2.6-2.05-1.6 0-2.6.85-2.65 2.2H7.15Z',
  3: 'M7.4 7.9c.3-2.25 2.25-4 5.15-4 2.95 0 5.15 1.55 5.15 4 0 1.7-.9 2.9-2.5 3.6 2.05.55 3.5 2.05 3.5 4.25 0 2.75-2.45 4.7-5.95 4.7-2.7 0-4.8-1.2-5.5-3.25l2.25-.85c.45 1.2 1.75 1.95 3.25 1.95 1.95 0 3.3-1.2 3.3-2.75s-1.35-2.6-3.45-2.6h-1.1v-2.05h.95c1.75 0 2.95-1.05 2.95-2.5s-1.2-2.35-3.05-2.35c-1.55 0-2.65.8-2.95 2.15H7.4Z',
  4: 'M13.45 4.8h2.55v8.05h1.9v2.2h-1.9v4.7h-2.55v-4.7H6.7v-2.45L13.45 4.8Zm0 2.95-4.15 5.1h4.15V7.75Z',
  5: 'M8.05 4.85h8.2v2.2h-5.7v3.15c.55-.2 1.2-.3 1.95-.3 2.85 0 5 1.7 5 4.45 0 2.85-2.3 4.7-5.55 4.7-2.55 0-4.55-1.15-5.15-3.2l2.2-.85c.35 1.2 1.5 1.95 2.95 1.95 1.7 0 2.9-1.05 2.9-2.6s-1.2-2.55-2.95-2.55c-.7 0-1.3.15-1.75.45H8.05V4.85Z',
  6: 'M12.35 4.7c2.35 0 4.05 1.15 4.7 2.95l-2.2.9c-.4-1.05-1.3-1.7-2.5-1.7-2.15 0-3.55 1.85-3.7 4.55 1-.85 2.25-1.3 3.6-1.3 2.7 0 4.7 1.8 4.7 4.4 0 2.7-2.15 4.6-5.15 4.6-3.3 0-5.5-2.45-5.5-7.2 0-3.95 2.2-7.2 5.95-7.2Zm-.15 7.35c-1.4 0-2.5.95-2.5 2.35s1.1 2.35 2.5 2.35 2.5-.95 2.5-2.35-1.1-2.35-2.5-2.35Z',
  7: 'M7.2 5.05h10.05v2.15L12.4 19.2h-2.7l4.6-11.85H7.2V5.05Z',
  8: 'M12 4.55c2.35 0 4.15 1.4 4.15 3.5 0 1.15-.6 2.1-1.6 2.7 1.4.7 2.25 1.85 2.25 3.5 0 2.35-1.95 4.2-4.8 4.2s-4.8-1.85-4.8-4.2c0-1.65.85-2.8 2.25-3.5-1-.6-1.6-1.55-1.6-2.7 0-2.1 1.8-3.5 4.15-3.5Zm0 2.05c-1.05 0-1.8.65-1.8 1.5s.75 1.5 1.8 1.5 1.8-.65 1.8-1.5-.75-1.5-1.8-1.5Zm0 5.4c-1.35 0-2.3.85-2.3 2s.95 2 2.3 2 2.3-.85 2.3-2-.95-2-2.3-2Z',
  // The 6 turned half a turn about the figure's centre.
  9: 'M11.65 19.1c-2.35 0-4.05-1.15-4.7-2.95l2.2-.9c.4 1.05 1.3 1.7 2.5 1.7 2.15 0 3.55-1.85 3.7-4.55-1 .85-2.25 1.3-3.6 1.3-2.7 0-4.7-1.8-4.7-4.4 0-2.7 2.15-4.6 5.15-4.6 3.3 0 5.5 2.45 5.5 7.2 0 3.95-2.2 7.2-5.95 7.2Zm.15-7.35c1.4 0 2.5-.95 2.5-2.35s-1.1-2.35-2.5-2.35-2.5.95-2.5 2.35 1.1 2.35 2.5 2.35Z',
};

/** Horizontal extent of each figure's ink, so a mark is centred on what is drawn, not on its box. */
export const FIGURE_INK: Record<number, readonly [number, number]> = {
  0: [6.65, 17.35],
  1: [10.2, 15.7],
  2: [6.85, 17.35],
  3: [7.25, 18.7],
  4: [6.7, 17.9],
  5: [6.8, 17.5],
  6: [6.3, 17.05],
  7: [7.2, 17.25],
  8: [7.2, 16.8],
  9: [6.95, 17.7],
};
const CENTRE = 12;
/** Space between the two figures of 10 to 99, and how far they are condensed to share one mark. */
const PAIR_GAP = 2;
export const PAIR_SQUEEZE = 0.78;

const round = (value: number) => +value.toFixed(2);

function Figure({ n, tx = 0 }: { n: number; tx?: number }) {
  const d = FIGURE[n];
  if (!d) return null;
  return <path d={d} transform={tx ? `translate(${round(tx)} 0)` : undefined} />;
}

/** Shift that centres a single figure. The 1 keeps part of its offset: its flag is light. */
function centring(n: number): number {
  const [left, right] = FIGURE_INK[n] ?? [CENTRE, CENTRE];
  const shift = CENTRE - (left + right) / 2;
  return n === 1 ? shift / 2 : shift;
}

/** Offsets and group transform that set two figures side by side, centred as one number. */
export function pairLayout(tens: number, ones: number): { tensShift: number; onesShift: number; origin: number } {
  const [tensLeft, tensRight] = FIGURE_INK[tens] ?? [0, 0];
  const [onesLeft, onesRight] = FIGURE_INK[ones] ?? [0, 0];
  const tensWidth = tensRight - tensLeft;
  const width = tensWidth + PAIR_GAP + (onesRight - onesLeft);
  return {
    tensShift: -tensLeft,
    onesShift: tensWidth + PAIR_GAP - onesLeft,
    origin: round(CENTRE - (PAIR_SQUEEZE * width) / 2),
  };
}

/**
 * Rail mark for an inline Ask-in-chat answer: a filled speech bubble in the
 * same geometric 24×24 currentColor language as the step numerals.
 */
export function FollowupIndexMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...BOX}
      className={['slm-step-index', 'slm-followup-index', className].filter(Boolean).join(' ')}
      fillRule="evenodd"
      clipRule="evenodd"
      {...rest}
    >
      <path d="M12 4.2c4.55 0 7.9 2.85 7.9 6.7 0 3.85-3.35 6.7-7.9 6.7-.6 0-1.2-.05-1.75-.15L6.5 19.8c-.45.25-1-.1-.95-.6l.3-3.05C4.5 14.9 3.7 13 3.7 10.9c0-3.85 3.75-6.7 8.3-6.7Zm-4.1 5.55a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Zm4.1 0a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Zm4.1 0a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z" />
    </svg>
  );
}

function PairOfFigures({ tens, ones }: { tens: number; ones: number }) {
  const { tensShift, onesShift, origin } = pairLayout(tens, ones);
  return (
    <g transform={`translate(${origin} 0) scale(${PAIR_SQUEEZE} 1)`}>
      <Figure n={tens} tx={tensShift} />
      <Figure n={ones} tx={onesShift} />
    </g>
  );
}

export function StepIndexMark({
  n,
  className,
  ...rest
}: { n: number } & SVGProps<SVGSVGElement>) {
  // A capsule may carry up to 20 steps; two figures cover every number the rail can show.
  const clamped = Math.max(1, Math.min(99, Math.round(n)));
  const tens = Math.floor(clamped / 10);
  const ones = clamped % 10;

  return (
    <svg
      {...BOX}
      className={['slm-step-index', className].filter(Boolean).join(' ')}
      fillRule="evenodd"
      clipRule="evenodd"
      {...rest}
    >
      {tens === 0 ? (
        <Figure n={ones} tx={centring(ones)} />
      ) : (
        <PairOfFigures tens={tens} ones={ones} />
      )}
    </svg>
  );
}
