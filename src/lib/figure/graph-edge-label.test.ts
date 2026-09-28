import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { boxHitsAny, measureText, polylineSegments, samplePathD, type Box } from './geom';
import { FONT_MIN, type Scene } from './types';

// FIG-GRAPH-LABEL-02: no edge — its own curve included — runs through an edge label's lettering, even with
// the panel's real font, which sets a little wider than the layout estimate.

const SPECS: Record<string, string> = {
  flowchart: 'node: start Start\nnode: check n > 1?\nnode: half n = n / 2\nnode: stop Stop\nterminal: start, stop\ndecision: check\nedge: start check\nedge: check half yes\nedge: check stop no\nedge: half check\nrankdir: TB',
  twoDecisions: 'node: start Start\nnode: check n > 1?\nnode: parity n even?\nnode: half n = n / 2\nnode: triple n = 3n + 1\nnode: stop Stop\nterminal: start, stop\ndecision: check, parity\nedge: start check\nedge: check parity yes\nedge: check stop no\nedge: parity half yes\nedge: parity triple no\nedge: half check\nedge: triple check\nrankdir: TB',
  stateMachine: 'node: idle Idle\nnode: running Running\nnode: done Done\nstart: idle\naccept: done\nedge: idle running start\nedge: running idle stop\nedge: running done finish\nrankdir: LR',
  pauseResume: 'node: idle Idle\nnode: running Running\nnode: paused Paused\nstart: idle\nedge: idle running start\nedge: running paused pause\nedge: paused running resume\nedge: running idle stop\nrankdir: LR',
  pathway: 'node: glucose Glucose\nnode: g6p Glucose-6-phosphate\nnode: f6p Fructose-6-phosphate\nedge: glucose g6p hexokinase\nedge: g6p f6p isomerase\nrankdir: TB',
  waitFor: 'node: t1 Thread 1\nnode: t2 Thread 2\nnode: l1 Lock A\nnode: l2 Lock B\nedge: t1 l1 holds\nedge: l1 t2 waits-for\nedge: t2 l2 holds\nedge: l2 t1 waits-for\nrankdir: TB',
  regulation: 'node: lacI LacI repressor\nnode: operator lac operator\nnode: genes lacZYA\nnode: lactose Allolactose\nedge: lacI operator inhibits\nedge: operator genes activates\nedge: lactose lacI inhibits\nrankdir: LR',
  automaton: 'node: s0 S0\nnode: s1 S1\nnode: s2 S2\nstart: s0\naccept: s2\nedge: s0 s1 a\nedge: s0 s0 b\nedge: s1 s1 a\nedge: s1 s2 b\nedge: s2 s1 a\nedge: s2 s0 b\nrankdir: LR',
  evenZeros: 'node: q0 q0\nnode: q1 q1\nstart: q0\naccept: q0\nedge: q0 q1 0\nedge: q1 q0 0\nedge: q0 q0 1\nedge: q1 q1 1\nrankdir: LR',
  wrappedLabels: 'node: r_student "STUDENT(StudentID, StudentName)"\nnode: r_course "COURSE(CourseID, CourseTitle, InstructorID)"\nnode: r_instructor "INSTRUCTOR(InstructorID, InstructorName)"\nnode: r_enrollment "ENROLLMENT(StudentID, CourseID, Grade)"\nedge: r_student r_enrollment StudentID-reference\nedge: r_course r_enrollment CourseID-reference\nedge: r_instructor r_course InstructorID-reference\nrankdir: LR',
};

function edgeSegments(scene: Scene) {
  return scene.strokes
    .filter((s) => /^edge-/.test(s.id))
    .flatMap((s) => (s.kind === 'path' && s.d ? samplePathD(s.d) : polylineSegments(s.points)));
}

/** The lettering of one label line in the panel font: 0.8 em tall, 5 % wider than the layout estimate. */
function inkBox(text: string, x: number, y: number): Box {
  const w = measureText(text, FONT_MIN).w * 1.05;
  const h = FONT_MIN * 0.8;
  return { x1: x - w / 2, y1: y - h / 2, x2: x + w / 2, y2: y + h / 2 };
}

describe('graph edge labels (FIG-GRAPH-LABEL-02)', () => {
  for (const [name, content] of Object.entries(SPECS)) {
    it(`${name}: every edge label is clear of every edge`, async () => {
      const result = await compileDiagramSpec({ type: 'graph', content }, 'step');
      expect(result.ok, result.ok ? '' : result.reason).toBe(true);
      if (!result.ok) return;
      const segs = edgeSegments(result.scene);
      const labels = result.scene.labels.filter((label) => /^edge-.*-label/.test(label.id));
      expect(labels.length, 'edge labels drawn').toBeGreaterThan(0);
      for (const label of labels) {
        expect(boxHitsAny(inkBox(label.text ?? '', label.x, label.y), segs, 1), `${label.id} "${label.text}" on an edge`).toBe(false);
      }
    });
  }
});
