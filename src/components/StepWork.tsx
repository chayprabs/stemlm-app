import type { Step } from '@/src/protocol/types';
import { MathMarkdown } from './MathMarkdown';
import { primaryStepQualityIssue, stepQualityMessage } from '@/src/protocol/step-quality';

export function StepWork({
  step,
  className = 'slm-step-work',
}: {
  step: Step;
  className?: string;
}) {
  const body = step.body.trim();
  const issue = primaryStepQualityIssue(step);

  if (!body && !issue) return null;

  return (
    <div className={className}>
      <span className="slm-step-work-label">Work</span>
      {body ? (
        <div className="slm-step-work-body slm-selectable">
          <MathMarkdown content={step.body} />
        </div>
      ) : (
        <p className="slm-step-quality-note">
          {stepQualityMessage(issue ?? 'formula_without_body', step)}
        </p>
      )}
      {body && issue && (
        <p className="slm-step-quality-note slm-step-quality-note--soft">
          {stepQualityMessage(issue, step)}
        </p>
      )}
    </div>
  );
}
