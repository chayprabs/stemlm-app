import { wrapMathSvg } from '../math-svg';
import type { MathQuestionDef } from './types';

export const Q25: MathQuestionDef = {
  id: 'q25',
  number: 25,
  topic: 'Confidence interval and z-test for a population mean',
  question:
    'A machine produces bolts whose lengths are normally distributed with known standard deviation $\\sigma=0.4$ cm. A sample of size $n=64$ has mean length $\\bar x=10.08$ cm. Construct a 95% confidence interval for the true mean $\\mu$, and test $$H_0:\\mu=10\\quad\\text{versus}\\quad H_1:\\mu\\ne 10$$ at the 5% significance level.',
  steps: [
    {
      title: 'Compute the standard error of the sample mean',
      formula:
        '$$\\operatorname{SE}(\\bar X)=\\frac{\\sigma}{\\sqrt n}=\\frac{0.4}{\\sqrt{64}}=\\frac{0.4}{8}=0.05$$',
      body: 'Because the sample size is $64$, the square root is $8$. The worked substitution is $$\\operatorname{SE}=\\frac{0.4}{8}=0.05.$$ So typical sample-mean fluctuations are about five hundredths of a centimeter.',
      diagram: wrapMathSvg(
        [
          '<line x1="34" y1="96" x2="266" y2="96" stroke="#333" stroke-width="2"/>',
          '<circle cx="150" cy="96" r="4" fill="#333"/>',
          '<circle cx="190" cy="96" r="4" fill="#dc2626"/>',
          '<text x="150" y="78" font-size="12" text-anchor="middle">10</text>',
          '<text x="190" y="78" font-size="12" text-anchor="middle">10.08</text>',
          '<text x="170" y="122" font-size="13" text-anchor="middle">SE = 0.05</text>',
        ].join(''),
      ),
    },
    {
      title: 'Build the 95% confidence interval',
      formula:
        '$$\\bar x\\pm z_{0.975}\\operatorname{SE}=10.08\\pm 1.96(0.05)=10.08\\pm 0.098$$\n$$\\text{CI}_{95\\%}=(9.982,\\ 10.178)$$',
      body: 'The critical value is $1.96$ for a two-sided 95% normal interval. Multiplying $1.96$ by $0.05$ gives the margin $0.098$, so the endpoints are $10.08-0.098=9.982$ and $10.08+0.098=10.178$.',
      diagram: wrapMathSvg(
        [
          '<line x1="36" y1="96" x2="264" y2="96" stroke="#333" stroke-width="2"/>',
          '<line x1="92" y1="78" x2="92" y2="114" stroke="#2563eb" stroke-width="2"/>',
          '<line x1="150" y1="70" x2="150" y2="122" stroke="#dc2626" stroke-width="2"/>',
          '<line x1="226" y1="78" x2="226" y2="114" stroke="#2563eb" stroke-width="2"/>',
          '<text x="92" y="66" font-size="12" text-anchor="middle">9.982</text>',
          '<text x="150" y="58" font-size="12" text-anchor="middle">10.08</text>',
          '<text x="226" y="66" font-size="12" text-anchor="middle">10.178</text>',
        ].join(''),
      ),
    },
    {
      title: 'Set up the two-sided z-test',
      body: 'Because $\\sigma$ is known, the appropriate test statistic is the standard normal z statistic. The null value is $\\mu_0=10$, and the two-sided alternative asks whether the true mean differs in either direction from $10$ cm.',
      diagram: wrapMathSvg(
        [
          '<path d="M 34 132 C 72 128 100 96 132 54 C 150 34 168 34 186 54 C 218 96 246 128 266 132" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<line x1="34" y1="132" x2="266" y2="132" stroke="#333" stroke-width="2"/>',
          '<text x="150" y="26" font-size="13" text-anchor="middle">two-sided test around z = 0</text>',
          '<text x="92" y="150" font-size="12" text-anchor="middle">left tail</text>',
          '<text x="208" y="150" font-size="12" text-anchor="middle">right tail</text>',
        ].join(''),
      ),
    },
    {
      title: 'Compute the observed z statistic',
      formula:
        '$$z=\\frac{\\bar x-\\mu_0}{\\sigma/\\sqrt n}=\\frac{10.08-10}{0.4/8}=\\frac{0.08}{0.05}=1.6$$',
      body: 'The sample mean is $0.08$ cm above the null value. Dividing by the standard error $0.05$ gives $z=1.6$, which is inside the usual acceptance band $(-1.96,1.96)$ for a 5% two-sided test.',
      diagram: wrapMathSvg(
        [
          '<line x1="34" y1="96" x2="266" y2="96" stroke="#333" stroke-width="2"/>',
          '<line x1="74" y1="80" x2="74" y2="112" stroke="#2563eb" stroke-width="2"/>',
          '<line x1="150" y1="80" x2="150" y2="112" stroke="#333" stroke-width="2"/>',
          '<line x1="212" y1="72" x2="212" y2="120" stroke="#dc2626" stroke-width="2"/>',
          '<line x1="226" y1="80" x2="226" y2="112" stroke="#2563eb" stroke-width="2"/>',
          '<text x="74" y="68" font-size="12" text-anchor="middle">-1.96</text>',
          '<text x="212" y="60" font-size="12" text-anchor="middle">1.6</text>',
          '<text x="226" y="68" font-size="12" text-anchor="middle">1.96</text>',
        ].join(''),
      ),
    },
    {
      title: 'Find the p-value and make the decision',
      formula:
        '$$p=2\\bigl(1-\\Phi(1.6)\\bigr)\\approx 2(1-0.9452)=0.1096$$',
      body: 'Using the standard normal table, $\\Phi(1.6)\\approx 0.9452$. Therefore the two-sided p-value is $2\\times 0.0548=0.1096$, which is larger than $\\alpha=0.05$, so the evidence is not strong enough to reject the null.',
      diagram: wrapMathSvg(
        [
          '<path d="M 34 132 C 72 128 100 96 132 54 C 150 34 168 34 186 54 C 218 96 246 128 266 132" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>',
          '<line x1="34" y1="132" x2="266" y2="132" stroke="#333" stroke-width="2"/>',
          '<line x1="92" y1="132" x2="92" y2="78" stroke="#dc2626" stroke-width="2"/>',
          '<line x1="208" y1="132" x2="208" y2="78" stroke="#dc2626" stroke-width="2"/>',
          '<text x="92" y="70" font-size="12" text-anchor="middle">-1.6</text>',
          '<text x="208" y="70" font-size="12" text-anchor="middle">1.6</text>',
          '<text x="150" y="28" font-size="13" text-anchor="middle">p = 0.1096</text>',
        ].join(''),
      ),
    },
    {
      title: 'Interpret the interval and the test together',
      formula:
        '$$10\\in(9.982,\\ 10.178)\\quad\\Longleftrightarrow\\quad \\text{fail to reject }H_0\\text{ at }5\\%$$',
      body: 'The null mean $10$ cm lies inside the 95% confidence interval because $$10\\in(9.982,10.178).$$ Also $$10.08-10=0.08=1.6(0.05),$$ so the sample mean is only $1.6$ standard errors above the null, not far enough for significance at the 5% level.',
      takeaway: 'For a known-$\\sigma$ normal mean problem, the two-sided z-test and the 95% confidence interval tell the same statistical story.',
    },
  ],
  solution:
    'The standard error is $$\\operatorname{SE}(\\bar X)=\\frac{0.4}{\\sqrt{64}}=0.05.$$ A 95% confidence interval is $$10.08\\pm 1.96(0.05)=10.08\\pm 0.098,$$ so $$\\mu\\in(9.982,\\ 10.178).$$ For the hypothesis test, $$z=\\frac{10.08-10}{0.4/8}=1.6.$$ The two-sided p-value is $$p=2\\bigl(1-\\Phi(1.6)\\bigr)\\approx 0.1096.$$ Since $0.1096>0.05$, we fail to reject $$H_0:\\mu=10.$$ This agrees with the fact that $10$ lies inside the 95% confidence interval.',
  verifiedPatterns: ['0.05', '9.982', '10.178', '1.6', '0.1096', 'fail to reject'],
  minDiagramSteps: 5,
};
