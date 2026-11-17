/**
 * Milliseconds of CPU this process has used so far. Tests time their work budgets with it rather
 * than with the wall clock: the suite runs in parallel, and a busy machine can stretch a wall-clock
 * measurement twentyfold while the CPU the code itself needs stays the same.
 */
export function cpuMs(): number {
  const { user, system } = process.cpuUsage();
  return (user + system) / 1000;
}
