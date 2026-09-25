import { expect, it } from 'vitest';
import { prepareMathForRender } from './math-content';

it.each([
  ['single token', 'a'.repeat(50_000)],
  ['unclosed backtick', '`' + 'x_1 = 2 '.repeat(10_000)],
])('MATH-02 prepares %s within 250 ms', (label, input) => {
  const start = performance.now();
  const output = prepareMathForRender(input!);
  const ms = performance.now() - start;
  console.log(`MATH-02 ${label}: chars=${input!.length} milliseconds=${ms.toFixed(1)}`);
  expect(output).toContain(label === 'single token' ? input : 'x_1');
  expect(ms).toBeLessThan(250);
}, 60_000);
