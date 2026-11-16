/**
 * The panel's scripted motion, in one place.
 *
 * Framer Motion needs numbers, so the durations and the curve of assets/tokens.css are repeated
 * here (a test holds the two in step): `--slm-dur-1/2/3` and `--slm-ease-out`. Everything is
 * short and happens once; under reduced motion nothing moves at all.
 */
export const MOTION_EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Seconds, by token step. */
export const MOTION_DUR = { 1: 0.12, 2: 0.18, 3: 0.26 } as const;

export type StepDirection = 1 | -1;

const STEP_SHIFT = 14;
const PANEL_SHIFT = 28;

/**
 * How a step page changes. The page slides a short distance in the direction of travel and fades,
 * so "next" and "previous" feel like turning pages in opposite directions without making the
 * reader wait.
 *
 * Variants take the direction as `custom`, which AnimatePresence also hands to the page that is
 * leaving, so both pages move the same way even though the outgoing one rendered before the move.
 */
const stepVariants = {
  enter: (direction: StepDirection) => ({ opacity: 0, x: STEP_SHIFT * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: StepDirection) => ({ opacity: 0, x: -STEP_SHIFT * direction }),
};

export function stepMotion(reducedMotion: boolean, direction: StepDirection) {
  if (reducedMotion) {
    return { initial: false as const, animate: { opacity: 1, x: 0 }, transition: { duration: 0 } };
  }
  return {
    variants: stepVariants,
    custom: direction,
    initial: 'enter',
    animate: 'center',
    exit: 'exit',
    transition: { duration: MOTION_DUR[2], ease: MOTION_EASE_OUT },
  };
}

/**
 * How the panel itself arrives and leaves: one sheet that slides a short way in from its docked
 * edge while it fades, and leaves the same way, a little faster. The travel is short on purpose:
 * a sheet two thirds of the window wide crossing the whole screen reads as a lurch, not an arrival.
 */
export function panelMotion(reducedMotion: boolean) {
  if (reducedMotion) {
    return { initial: false as const, animate: { opacity: 1, x: 0 }, transition: { duration: 0 } };
  }
  return {
    initial: { opacity: 0, x: PANEL_SHIFT },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: PANEL_SHIFT, transition: { duration: MOTION_DUR[2], ease: MOTION_EASE_OUT } },
    transition: { duration: MOTION_DUR[3], ease: MOTION_EASE_OUT },
  };
}
