import { expect, it } from 'vitest';
import { prepareMathForRender } from './math-content';
import { fastestCpuMs } from './cpu-time';

// About 15 and 50 ms of CPU on a quiet machine; the budget leaves room for a busy one and still
// catches a pass that rescans the input (seconds at these lengths).
it.each([
  ['single token', 'a'.repeat(50_000)],
  ['unclosed backtick', '`' + 'x_1 = 2 '.repeat(10_000)],
])('MATH-02 prepares %s within 500 ms of CPU', (label, input) => {
  let output = '';
  const ms = fastestCpuMs(() => { output = prepareMathForRender(input!); });
  console.log(`MATH-02 ${label}: chars=${input!.length} milliseconds=${ms.toFixed(1)}`);
  expect(output).toContain(label === 'single token' ? input : 'x_1');
  expect(ms).toBeLessThan(500);
}, 60_000);
