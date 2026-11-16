/**
 * How a step page changes. The page slides a short distance in the direction of travel and fades,
 * so "next" and "previous" feel like turning pages in opposite directions without making the
 * reader wait: the whole exchange is under a quarter of a second.
 *
 * Variants take the direction as `custom`, which AnimatePresence also hands to the page that is
 * leaving, so both pages move the same way even though the outgoing one rendered before the move.
 */
export type StepDirection = 1 | -1;

const SHIFT = 14;
const EASE = [0.22, 1, 0.36, 1] as const;

const variants = {
  enter: (direction: StepDirection) => ({ opacity: 0, x: SHIFT * direction }),
  center: { opacity: 1, x: 0 },
  exit: (direction: StepDirection) => ({ opacity: 0, x: -SHIFT * direction }),
};

export function stepMotion(reducedMotion: boolean, direction: StepDirection) {
  if (reducedMotion) {
    return { initial: false as const, animate: { opacity: 1, x: 0 }, transition: { duration: 0 } };
  }
  return {
    variants,
    custom: direction,
    initial: 'enter',
    animate: 'center',
    exit: 'exit',
    transition: { duration: 0.2, ease: EASE },
  };
}
