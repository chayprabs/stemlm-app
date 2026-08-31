import { useState } from 'react';
import { getController } from '@/src/content/controller';
import type { Session } from '@/src/protocol/types';
import type { DiagramCompileFailure } from './DiagramRenderer';
import { useStore } from '@/src/state/store';

export interface FigureRepairFailure extends Omit<DiagramCompileFailure, 'code'> {
  code: string;
}

export function RepairFigureButton({
  session,
  stepId,
  failure,
}: {
  session: Session;
  stepId?: string;
  failure: FigureRepairFailure;
}) {
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(false);

  async function repair() {
    if (busy || used) return;
    const controller = getController();
    if (!controller) {
      useStore.getState().setStatus('error', 'stemLM is not ready on this page. Reload the tab and try again.');
      return;
    }
    setBusy(true);
    const ok = await controller.repairFigure({
      sessionId: session.id,
      subject: session.capsule.meta.subject,
      stepId,
      family: failure.family,
      failingKeys: failure.failingKeys,
      code: failure.code,
      reason: failure.reason,
    });
    setBusy(false);
    if (ok) setUsed(true);
  }

  return (
    <div className="slm-followup slm-followup--deeper" data-repair-family={failure.family}>
      <div className="slm-followup-copyblock">
        <span className="slm-followup-label">Figure needs repair</span>
        <p className="slm-followup-text">{failure.reason}</p>
      </div>
      <div className="slm-followup-actions">
        <button
          type="button"
          className="slm-followup-action slm-followup-action--ask"
          onClick={() => void repair()}
          disabled={busy || used}
          aria-label={`Fix this ${failure.family} figure`}
        >
          {used ? 'Repair added' : busy ? 'Preparing repair…' : 'Fix this figure'}
        </button>
      </div>
    </div>
  );
}
