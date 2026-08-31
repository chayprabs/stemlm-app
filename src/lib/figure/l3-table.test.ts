import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import type { Scene } from './types';

type TableSemantics = {
  headers: string[];
  rows: string[][];
  highlights: string[];
};

function textOf(label: Scene['labels'][number]): string {
  return label.katex ?? label.text ?? '';
}

function extractTable(scene: Scene): TableSemantics {
  const collect = (pattern: RegExp): Map<string, Map<number, string[]>> => {
    const values = new Map<string, Map<number, string[]>>();
    for (const label of scene.labels) {
      const match = pattern.exec(label.id);
      if (!match) continue;
      const key = match[1]!;
      const line = Number(match[2] ?? 0);
      const lines = values.get(key) ?? new Map<number, string[]>();
      const texts = lines.get(line) ?? [];
      const text = textOf(label);
      if (!texts.includes(text)) texts.push(text);
      lines.set(line, texts);
      values.set(key, lines);
    }
    return values;
  };
  const render = (lines: Map<number, string[]>): string => {
    const parts = [...lines.entries()]
      .sort(([a], [b]) => a - b)
      .flatMap(([, texts]) => texts);
    return parts.slice(1).reduce(
      (value, part) => `${value}${/[-/(]$/.test(value) || /^[,.;:!?)]/.test(part) ? '' : ' '}${part}`,
      parts[0] ?? '',
    );
  };
  const headers = [...collect(/^table-header-(\d+)(?:-panel-\d+-\d+)?(?:-line-(\d+))?$/)]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, lines]) => render(lines));
  const cells = new Map<string, Map<number, string[]>>();
  for (const label of scene.labels) {
    const match = /^table-cell-(\d+)-(\d+)(?:-line-(\d+))?$/.exec(label.id);
    if (!match) continue;
    const key = `${match[1]}-${match[2]}`;
    const line = Number(match[3] ?? 0);
    const lines = cells.get(key) ?? new Map<number, string[]>();
    const texts = lines.get(line) ?? [];
    const text = textOf(label);
    if (!texts.includes(text)) texts.push(text);
    lines.set(line, texts);
    cells.set(key, lines);
  }
  const cellEntries = [...cells.entries()].map(([key, lines]) => {
    const parts = key.split('-').map(Number);
    return { row: parts[0]!, column: parts[1]!, text: render(lines) };
  });
  const rowCount = cellEntries.length ? Math.max(...cellEntries.map(({ row }) => row)) + 1 : 0;
  const rows = Array.from({ length: rowCount }, (_, row) => cellEntries
    .filter((cell) => cell.row === row)
    .sort((a, b) => a.column - b.column)
    .map(({ text }) => text));
  return {
    headers,
    rows,
    highlights: scene.highlights
      .filter((value) => /^(?:table-header|table-cell)-.+-highlight$/.test(value))
      .map((value) => value.toLowerCase()),
  };
}

function certificate(scene: Scene, expected: TableSemantics): boolean {
  const actual = extractTable(scene);
  return JSON.stringify(actual) === JSON.stringify({
    headers: expected.headers,
    rows: expected.rows,
    highlights: expected.highlights.map((value) => value.toLowerCase()),
  });
}

function cellText(scene: Scene, row: number, column: number): string {
  const prefix = `table-cell-${row}-${column}`;
  return scene.labels
    .filter((label) => label.id === prefix || label.id.startsWith(`${prefix}-line-`))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map(textOf)
    .join(' ');
}

type FrameBounds = { x: number; y: number; w: number; h: number };

function frameBounds(scene: Scene): FrameBounds[] {
  return scene.strokes
    .filter((stroke) => stroke.id.startsWith('frame') && stroke.kind === 'rect' && stroke.points.length >= 4)
    .map((stroke) => ({ x: stroke.points[0]!, y: stroke.points[1]!, w: stroke.points[2]!, h: stroke.points[3]! }));
}

function assertTableLabelsInsideCells(scene: Scene, laid: Extract<ReturnType<typeof layoutScene>, { ok: true }>): void {
  const frames = frameBounds(scene);
  const boundaries = scene.strokes.filter((stroke) => stroke.role === 'axis' && stroke.kind === 'line' && stroke.points.length >= 4);
  const labels = laid.placed.filter((entry) => /^(?:table-header|table-cell)-/.test(entry.label.id));
  expect(labels.length).toBeGreaterThan(0);
  for (const placed of labels) {
    const frame = frames.find((candidate) => placed.x >= candidate.x && placed.x <= candidate.x + candidate.w && placed.y >= candidate.y && placed.y <= candidate.y + candidate.h);
    expect(frame, placed.label.id).toBeDefined();
    if (!frame) continue;
    expect(placed.box.x1, placed.label.id).toBeGreaterThanOrEqual(frame.x);
    expect(placed.box.y1, placed.label.id).toBeGreaterThanOrEqual(frame.y);
    expect(placed.box.x2, placed.label.id).toBeLessThanOrEqual(frame.x + frame.w);
    expect(placed.box.y2, placed.label.id).toBeLessThanOrEqual(frame.y + frame.h);
    const verticalBounds = [
      frame.x,
      ...boundaries
        .filter((stroke) => {
          const [x1, y1, x2, y2] = stroke.points;
          return x1 === x2 && y1! <= frame.y && frame.y + frame.h <= y2!;
        })
        .map((stroke) => stroke.points[2])
        .filter((x): x is number => x !== undefined && x > frame.x && x < frame.x + frame.w),
      frame.x + frame.w,
    ].sort((a, b) => a - b);
    const horizontalBounds = [
      frame.y,
      ...boundaries
        .filter((stroke) => {
          const [x1, y1, x2, y2] = stroke.points;
          return y1 === y2 && x1! <= frame.x && frame.x + frame.w <= x2!;
        })
        .map((stroke) => stroke.points[1])
        .filter((y): y is number => y !== undefined && y > frame.y && y < frame.y + frame.h),
      frame.y + frame.h,
    ].sort((a, b) => a - b);
    const localColumn = verticalBounds.findIndex((bound, index) => placed.x >= bound && placed.x <= verticalBounds[index + 1]!);
    const row = horizontalBounds.findIndex((bound, index) => placed.y >= bound && placed.y <= horizontalBounds[index + 1]!);
    expect(localColumn, placed.label.id).toBeGreaterThanOrEqual(0);
    expect(row, placed.label.id).toBeGreaterThanOrEqual(0);
    const cellLeft = verticalBounds[localColumn];
    const cellRight = verticalBounds[localColumn + 1];
    const cellTop = horizontalBounds[row];
    const cellBottom = horizontalBounds[row + 1];
    expect(cellLeft, placed.label.id).toBeDefined();
    expect(cellRight, placed.label.id).toBeDefined();
    expect(cellTop, placed.label.id).toBeDefined();
    expect(cellBottom, placed.label.id).toBeDefined();
    if (cellLeft === undefined || cellRight === undefined || cellTop === undefined || cellBottom === undefined) continue;
    expect(placed.box.x1, placed.label.id).toBeGreaterThanOrEqual(cellLeft);
    expect(placed.box.y1, placed.label.id).toBeGreaterThanOrEqual(cellTop);
    expect(placed.box.x2, placed.label.id).toBeLessThanOrEqual(cellRight);
    expect(placed.box.y2, placed.label.id).toBeLessThanOrEqual(cellBottom);
    for (const boundary of boundaries) {
      const x1 = boundary.points[0]!;
      const y1 = boundary.points[1]!;
      const x2 = boundary.points[2]!;
      const y2 = boundary.points[3]!;
      const verticalCrossing = x1 === x2 && placed.box.x1 < x1 && x1 < placed.box.x2 && placed.box.y1 < Math.max(y1, y2) && Math.min(y1, y2) < placed.box.y2;
      const horizontalCrossing = y1 === y2 && placed.box.y1 < y1 && y1 < placed.box.y2 && placed.box.x1 < Math.max(x1, x2) && Math.min(x1, x2) < placed.box.x2;
      expect(verticalCrossing || horizontalCrossing, `${placed.label.id} crosses a table boundary`).toBe(false);
    }
  }
}

function assertLabelsInsideOwnedCells(scene: Scene, laid: Extract<ReturnType<typeof layoutScene>, { ok: true }>): void {
  const epsilon = 1e-6;
  const frames = frameBounds(scene).filter((frame) => frame.w > 0 && frame.h > 0);
  const boundaries = scene.strokes.filter((stroke) => stroke.role === 'axis' && stroke.kind === 'line' && stroke.points.length >= 4);
  const labels = laid.placed.filter((entry) => /^(?:table-header|table-cell|table-row-key)-/.test(entry.label.id));
  expect(labels.length).toBeGreaterThan(0);

  for (const placed of labels) {
    const ownerFrame = frames.find((frame) => entryInsideFrame(placed.label.x, placed.label.y, frame));
    expect(ownerFrame, placed.label.id).toBeDefined();
    if (!ownerFrame) continue;
    expect(placed.box.x1, placed.label.id).toBeGreaterThanOrEqual(ownerFrame.x + 6 - epsilon);
    expect(placed.box.y1, placed.label.id).toBeGreaterThanOrEqual(ownerFrame.y + 6 - epsilon);
    expect(placed.box.x2, placed.label.id).toBeLessThanOrEqual(ownerFrame.x + ownerFrame.w - 6 + epsilon);
    expect(placed.box.y2, placed.label.id).toBeLessThanOrEqual(ownerFrame.y + ownerFrame.h - 6 + epsilon);

    const verticalBounds = [
      ownerFrame.x,
      ...boundaries
        .filter((stroke) => {
          const [x1, y1, x2, y2] = stroke.points;
          return x1 === x2 && y1! <= ownerFrame.y && ownerFrame.y + ownerFrame.h <= y2!;
        })
        .map((stroke) => stroke.points[2])
        .filter((x): x is number => x !== undefined && x > ownerFrame.x && x < ownerFrame.x + ownerFrame.w),
      ownerFrame.x + ownerFrame.w,
    ].sort((a, b) => a - b);
    const horizontalBounds = [
      ownerFrame.y,
      ...boundaries
        .filter((stroke) => {
          const [x1, y1, x2, y2] = stroke.points;
          return y1 === y2 && x1! <= ownerFrame.x && ownerFrame.x + ownerFrame.w <= x2!;
        })
        .map((stroke) => stroke.points[1])
        .filter((y): y is number => y !== undefined && y > ownerFrame.y && y < ownerFrame.y + ownerFrame.h),
      ownerFrame.y + ownerFrame.h,
    ].sort((a, b) => a - b);
    const column = verticalBounds.findIndex((bound, index) => placed.label.x >= bound && placed.label.x <= verticalBounds[index + 1]!);
    const row = horizontalBounds.findIndex((bound, index) => placed.label.y >= bound && placed.label.y <= horizontalBounds[index + 1]!);
    expect(column, placed.label.id).toBeGreaterThanOrEqual(0);
    expect(row, placed.label.id).toBeGreaterThanOrEqual(0);
    if (column < 0 || row < 0) continue;
    expect(placed.box.x1, placed.label.id).toBeGreaterThanOrEqual(verticalBounds[column]! + 6 - epsilon);
    expect(placed.box.x2, placed.label.id).toBeLessThanOrEqual(verticalBounds[column + 1]! - 6 + epsilon);
    expect(placed.box.y1, placed.label.id).toBeGreaterThanOrEqual(horizontalBounds[row]! + 6 - epsilon);
    expect(placed.box.y2, placed.label.id).toBeLessThanOrEqual(horizontalBounds[row + 1]! - 6 + epsilon);
  }
}

function entryInsideFrame(x: number, y: number, frame: FrameBounds): boolean {
  return x >= frame.x && x <= frame.x + frame.w && y >= frame.y && y <= frame.y + frame.h;
}

function assertTiledPanelsPreserveRowIdentity(
  scene: Scene,
  laid: Extract<ReturnType<typeof layoutScene>, { ok: true }>,
  rowKeys: string[],
): void {
  const frames = frameBounds(scene);
  expect(frames.length).toBeGreaterThan(1);
  const labels = laid.placed.filter((entry) => /^(?:table-header|table-cell|table-row-key)-/.test(entry.label.id));
  expect(labels.length).toBeGreaterThan(0);

  for (const frame of frames) {
    const panelLabels = labels.filter((entry) => entry.x >= frame.x && entry.x <= frame.x + frame.w && entry.y >= frame.y && entry.y <= frame.y + frame.h);
    expect(panelLabels.length).toBeGreaterThan(0);

    const verticalBounds = [
      frame.x,
      ...scene.strokes
        .filter((stroke) => stroke.role === 'axis' && stroke.kind === 'line' && stroke.points.length >= 4)
        .filter((stroke) => {
          const [x1, y1, x2, y2] = stroke.points;
          return x1 === x2 && y1! <= frame.y && frame.y + frame.h <= y2!;
        })
        .map((stroke) => stroke.points[2])
        .filter((x): x is number => x !== undefined && x > frame.x && x < frame.x + frame.w),
      frame.x + frame.w,
    ].sort((a, b) => a - b);
    const horizontalBounds = [
      frame.y,
      ...scene.strokes
        .filter((stroke) => stroke.role === 'axis' && stroke.kind === 'line' && stroke.points.length >= 4)
        .filter((stroke) => {
          const [x1, y1, x2, y2] = stroke.points;
          return y1 === y2 && x1! <= frame.x && frame.x + frame.w <= x2!;
        })
        .map((stroke) => stroke.points[1])
        .filter((y): y is number => y !== undefined && y > frame.y && y < frame.y + frame.h),
      frame.y + frame.h,
    ].sort((a, b) => a - b);

    for (const [rowIndex, rowKey] of rowKeys.entries()) {
      const rowKeyLabels = panelLabels
        .filter((entry) => entry.label.id.startsWith(`table-cell-${rowIndex}-0`) || entry.label.id.startsWith(`table-row-key-${rowIndex}-panel-`))
        .sort((a, b) => a.y - b.y);
      expect(rowKeyLabels.map((entry) => textOf(entry.label)).join(' '), `${frame.x},${frame.y} missing row key ${rowKey}`).toContain(rowKey);
    }
    for (const placed of panelLabels) {
      const left = verticalBounds.findIndex((bound, index) => placed.x >= bound && placed.x <= verticalBounds[index + 1]!);
      const top = horizontalBounds.findIndex((bound, index) => placed.y >= bound && placed.y <= horizontalBounds[index + 1]!);
      expect(left, placed.label.id).toBeGreaterThanOrEqual(0);
      expect(top, placed.label.id).toBeGreaterThanOrEqual(0);
      if (left < 0 || top < 0) continue;
      expect(placed.box.x1, placed.label.id).toBeGreaterThanOrEqual(verticalBounds[left]!);
      expect(placed.box.x2, placed.label.id).toBeLessThanOrEqual(verticalBounds[left + 1]!);
      expect(placed.box.y1, placed.label.id).toBeGreaterThanOrEqual(horizontalBounds[top]!);
      expect(placed.box.y2, placed.label.id).toBeLessThanOrEqual(horizontalBounds[top + 1]!);
    }
  }
}

function assertCoherentFiveColumnMatrix(
  scene: Scene,
  laid: Extract<ReturnType<typeof layoutScene>, { ok: true }>,
): void {
  const frames = frameBounds(scene);
  expect(frames).toHaveLength(1);
  const frame = frames[0];
  expect(frame).toBeDefined();
  if (!frame) return;

  const vertical = scene.strokes.filter((stroke) => {
    const [x1, y1, x2, y2] = stroke.points;
    return stroke.role === 'axis'
      && stroke.kind === 'line'
      && x1 !== undefined
      && y1 !== undefined
      && x2 !== undefined
      && y2 !== undefined
      && x1 === x2
      && y1 === frame.y
      && y2 === frame.y + frame.h
      && x1 > frame.x
      && x1 < frame.x + frame.w;
  });
  const horizontal = scene.strokes.filter((stroke) => {
    const [x1, y1, x2, y2] = stroke.points;
    return stroke.role === 'axis'
      && stroke.kind === 'line'
      && x1 !== undefined
      && y1 !== undefined
      && x2 !== undefined
      && y2 !== undefined
      && y1 === y2
      && x1 === frame.x
      && x2 === frame.x + frame.w
      && y1 > frame.y
      && y1 < frame.y + frame.h;
  });
  expect(vertical).toHaveLength(4);
  expect(horizontal).toHaveLength(3);
  assertLabelsInsideOwnedCells(scene, laid);
}

async function compile(content: string) {
  return compileDiagramSpec({ type: 'table', content }, 'step');
}

describe('L3 table fidelity', () => {
  it('certifies ordered relation-schema matrices across varying row counts', async () => {
    const cases = [
      {
        content: [
          'kind: matrix',
          'headers: id, relation, columns, key',
          'row: r1, R, StudentID StudentName CourseID CourseName Instructor, StudentID CourseID',
        ].join('\n'),
        headers: ['id', 'relation', 'columns', 'key'],
        rows: [['r1', 'R', 'StudentID StudentName CourseID CourseName Instructor', 'StudentID CourseID']],
      },
      {
        content: [
          'kind: matrix',
          'headers: id, relation, columns, key',
          'row: r1, Student, StudentID StudentName, StudentID',
          'row: r2, Enrollment1, StudentID CourseID CourseName Instructor, StudentID CourseID',
        ].join('\n'),
        headers: ['id', 'relation', 'columns', 'key'],
        rows: [
          ['r1', 'Student', 'StudentID StudentName', 'StudentID'],
          ['r2', 'Enrollment1', 'StudentID CourseID CourseName Instructor', 'StudentID CourseID'],
        ],
      },
      {
        content: [
          'kind: matrix',
          'headers: id, relation, columns, key',
          'row: r1, Student, StudentID StudentName, StudentID',
          'row: r2, Course, CourseID CourseName Instructor, CourseID',
          'row: r3, Enrollment, StudentID CourseID, StudentID CourseID',
        ].join('\n'),
        headers: ['id', 'relation', 'columns', 'key'],
        rows: [
          ['r1', 'Student', 'StudentID StudentName', 'StudentID'],
          ['r2', 'Course', 'CourseID CourseName Instructor', 'CourseID'],
          ['r3', 'Enrollment', 'StudentID CourseID', 'StudentID CourseID'],
        ],
      },
    ];

    for (const table of cases) {
      const result = await compile(table.content);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(extractTable(result.scene)).toMatchObject({
        headers: table.headers,
        rows: table.rows,
      });
      expect(layoutScene(result.scene).ok).toBe(true);
    }
  });

  it('freezes the iteration 127 probability distribution matrix', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: x, P(X=x)',
      'row: 0, 1/8',
      'row: 1, 3/8',
      'row: 2, 3/8',
      'row: 3, 1/8',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const actual = extractTable(result.scene);
    expect(actual.headers).toEqual(['x', 'P(X=x)']);
    expect(actual.rows).toEqual([
      ['0', '1/8'],
      ['1', '3/8'],
      ['2', '3/8'],
      ['3', '1/8'],
    ]);
    expect(layoutScene(result.scene).ok).toBe(true);
  });

  it('round-trips ordered headers, ragged rows, and highlighted cells', async () => {
    const content = [
      'kind: matrix',
      'headers: Index,Values',
      'row: 0,1',
      'row: 1,2,1',
      'row: 2,3,4,3',
      'highlight: 4',
    ].join('\n');
    const result = await compile(content);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(certificate(result.scene, {
      headers: ['Index', 'Values'],
      rows: [['0', '1'], ['1', '2', '1'], ['2', '3', '4', '3']],
      highlights: ['table-cell-2-2-highlight'],
    })).toBe(true);
    const row0 = result.scene.labels.find((label) => label.id === 'table-cell-0-1');
    const row2 = result.scene.labels.find((label) => label.id === 'table-cell-2-2');
    expect(row0 && row2).toBeTruthy();
    expect(row0!.x).toBe(row2!.x);
  });

  it('preserves math cells as labels and ICE phase rows', async () => {
    const result = await compile([
      'kind: ice',
      'species: X2,Y2,XY',
      'I: 1,2,0',
      'C: -q,-2q,+2q',
      'E: 1-q,2-2q,2q',
      'highlight_row: C',
      'caption: Equilibrium values',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const actual = extractTable(result.scene);
    expect(actual.headers).toEqual(['', 'X2', 'Y2', 'XY']);
    expect(actual.rows).toEqual([
      ['I', '1', '2', '0'],
      ['C', '-q', '-2q', '+2q'],
      ['E', '1-q', '2-2q', '2q'],
    ]);
    expect(result.scene.labels.some((label) => label.text === 'Equilibrium values')).toBe(true);
  });

  it('infers a grouped final header over a wider ragged data tail', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: Index,Values',
      'row: 0,1',
      'row: 1,2,1',
      'row: 2,3,4,3',
      'row: 3,4,10,10,4',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const groupedHeader = result.scene.labels.find((label) => label.id === 'table-header-1');
    const firstTailBoundary = result.scene.strokes.find((stroke) => stroke.id === 'vc1');
    const lastBoundary = result.scene.strokes.find((stroke) => stroke.id === 'vc4');
    const headerBottom = result.scene.strokes.find((stroke) => stroke.id === 'hr1');
    const frame = result.scene.strokes.find((stroke) => stroke.id === 'frame');
    expect(groupedHeader && firstTailBoundary && lastBoundary && headerBottom && frame).toBeTruthy();
    expect(groupedHeader!.x).toBeCloseTo((firstTailBoundary!.points[0]! + frame!.points[0]! + frame!.points[2]!) / 2, 5);
    expect(lastBoundary!.points[1]).toBeCloseTo(headerBottom!.points[1]!, 5);
  });

  it('renders a complete Punnett matrix and math-rich cells', async () => {
    const result = await compile([
      'kind: punnett',
      'columns: Tall,Short',
      'rows: Tall,Short',
      'cells:',
      '  - TT,Tt',
      '  - Tt,tt',
      'highlight: tt',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toMatchObject({
      headers: ['', 'Tall', 'Short'],
      rows: [['Tall', 'TT', 'Tt'], ['Short', 'Tt', 'tt']],
    });
    expect(result.scene.highlights.some((value) => value.toLowerCase() === 'tt')).toBe(true);
    expect(result.scene.strokes.filter((stroke) => stroke.id.endsWith('-highlight')).map((stroke) => stroke.id)).toEqual([
      'table-cell-1-2-highlight',
    ]);
  });

  it('fails closed for unsupported kinds, ignored assertions, and inconsistent ICE vectors', async () => {
    for (const content of [
      'kind: choropleth\nheaders: Region,Value\nrow: north,low',
      'kind: matrix\nheaders: A,B\nrow: 0,1\ngroup: loop-one over cells\nleader: loop-one to AB',
      'kind: matrix\nheaders: Reservoir,Duration\nrow: A,2 weeks\nscale: logarithmic bar length',
      'kind: ice\nspecies: X,Y,Z\nI: 1,2\nC: -q,-q,-q\nE: 1-q,2-q,q',
    ]) {
      const result = await compile(content);
      expect(result.ok).toBe(false);
    }
  });

  it('fails closed for pipe-delimited matrix data', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: Label | Value',
      'row: alpha | beta',
    ].join('\n'));
    expect(result).toMatchObject({
      ok: false,
      code: 'malformed',
      reason: 'table_pipe_delimited_data_use_comma_or_semicolon',
    });
  });

  it('preserves pipe characters in legacy plural rows', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: Label,Value',
      'rows: left | right; upper | lower',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toMatchObject({
      headers: ['Label', 'Value'],
      rows: [['left | right', 'upper | lower']],
    });
  });

  it('certificate rejects a deliberately wrong scene even when it remains tidy', async () => {
    const result = await compile('kind: matrix\nheaders: A,B\nrow: one,two\nhighlight: two');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const wrong: Scene = {
      ...result.scene,
      labels: result.scene.labels.map((label) =>
        label.id === 'table-cell-0-1' ? { ...label, text: 'swapped' } : label,
      ),
    };
    expect(certificate(wrong, {
      headers: ['A', 'B'],
      rows: [['one', 'two']],
      highlights: ['two'],
    })).toBe(false);
  });

  it('tiles a dense table without dropping semantic cells or highlights', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: Index,Value',
      ...Array.from({ length: 12 }, (_, index) => `row: ${index},${index * index}`),
      'highlight: 49',
    ].join('\n'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({
      headers: ['Index', 'Value'],
      rows: Array.from({ length: 12 }, (_, index) => [String(index), String(index * index)]),
      highlights: ['table-cell-7-1-highlight'],
    });
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('frame')).length).toBeGreaterThan(1);
  });

  it('fits a small relation matrix with punctuation-packed schema labels', async () => {
    const enrollmentAttributes = 'StudentID; StudentName; CourseID; CourseName; InstructorID; InstructorName; Grade';
    const courseEnrollmentAttributes = 'StudentID; CourseID; CourseName; InstructorID; InstructorName; Grade';
    const result = await compile([
      'kind: matrix',
      'headers: relation, attributes',
      `row: Enrollment, ${enrollmentAttributes}`,
      `row: CourseEnrollment, ${courseEnrollmentAttributes}`,
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(cellText(result.scene, 0, 1)).toBe(enrollmentAttributes);
    expect(cellText(result.scene, 1, 1)).toBe(courseEnrollmentAttributes);
    expect(result.scene.labels.filter((label) => label.id.startsWith('table-cell-0-1-line-'))).not.toHaveLength(0);

    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const frame = result.scene.strokes.find((stroke) => stroke.id === 'frame');
    const divider = result.scene.strokes.find((stroke) => stroke.id === 'vc1');
    expect(frame && divider).toBeTruthy();
    if (!frame || !divider) return;
    const dividerX = divider.points[0]!;
    const rightEdge = frame.points[0]! + frame.points[2]!;
    for (const placed of laid.placed.filter((entry) => /^table-cell-\d+-1-line-\d+$/.test(entry.label.id))) {
      expect(placed.box.x1).toBeGreaterThanOrEqual(dividerX);
      expect(placed.box.x2).toBeLessThanOrEqual(rightEdge);
    }
  });

  it('keeps every header and structured label inside its owning frame and cell', async () => {
    const cases = [
      [
        'kind: matrix',
        'headers: relation, attributes',
        'row: Enrollment, StudentID; StudentName; CourseID; CourseName; InstructorID; InstructorName; Grade',
      ],
      [
        'kind: matrix',
        'headers: relation, attributes',
        'row: Student, StudentID; StudentName; Major',
        'row: Course, CourseID; CourseName; Department',
        'row: Instructor, InstructorID; InstructorName; Department',
        'row: Enrollment, StudentID; CourseID; Grade',
      ],
    ];

    for (const lines of cases) {
      const result = await compile(lines.join('\n'));
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const laid = layoutScene(result.scene);
      expect(laid.ok).toBe(true);
      if (!laid.ok) continue;
      assertLabelsInsideOwnedCells(result.scene, laid);
    }
  });

  it('fits a three-row matrix with labels in every data column and keeps tracks aligned', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: item, first attribute column, second attribute column, third attribute column',
      'row: row one, alpha beta gamma, x y, red blue',
      'row: row two, delta epsilon zeta, p q, cyan green',
      'row: row three, eta theta iota, m n, black white',
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTableLabelsInsideCells(result.scene, laid);
  });

  it('adapts readable height for a verbose five-column three-row comparison', async () => {
    const headers = [
      'Observed Characteristic And Identifying Description',
      'Collection Context And Preparation Conditions',
      'Primary Transformation Or Processing Mechanism',
      'Intermediate State Through Final Usable Outcome',
      'Transfer Pathway And Receiving Destination',
    ];
    const rows = [
      ['Category Alpha With Distinguishing Traits', 'Initial Setting Followed By Controlled Preparation', 'Sequential Conversion Through Several Coordinated Stages', 'Complex Input Becomes A Smaller Usable Output Form', 'Dedicated Channel Carries The Result To Its Destination'],
      ['Category Beta With Distinguishing Traits', 'Separate Setting Followed By Controlled Preparation', 'Parallel Conversion Through Several Coordinated Stages', 'Structured Input Becomes A Smaller Usable Output Form', 'Dedicated Channel Carries The Result To Its Destination'],
      ['Category Gamma With Distinguishing Traits', 'Primary Setting Followed By Controlled Preparation', 'Targeted Conversion Through Several Coordinated Stages', 'Compound Input Becomes A Smaller Usable Output Form', 'Dedicated Channel Carries The Result To Its Destination'],
    ];
    const result = await compile([
      'kind: matrix',
      `headers: ${headers.join(', ')}`,
      ...rows.map((row) => `row: ${row.join(', ')}`),
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toMatchObject({ headers, rows });
    expect(new Set(result.scene.labels.map((label) => label.id.match(/^table-header-\d+/)?.[0]).filter(Boolean))).toHaveLength(5);
    expect(new Set(result.scene.labels.map((label) => label.id.match(/^table-cell-\d+-\d+/)?.[0]).filter(Boolean))).toHaveLength(15);
    expect(result.scene.height).toBeGreaterThan(result.scene.width);
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTableLabelsInsideCells(result.scene, laid);
  });

  it('wraps verbose comparison labels at word boundaries and keeps them in cells', async () => {
    const headers = [
      'Measurement Context And Starting Conditions',
      'Primary Transformation Mechanism And Intermediate State',
      'Observable Output And Receiving Destination',
      'Supporting Evidence And Measurement Procedure',
      'Final Interpretation And Limiting Assumptions',
    ];
    const rows = [
      ['Baseline Category With Distinguishing Characteristics', 'Sequential Conversion Through Coordinated Stages', 'Structured Result Delivered To The Receiving Compartment', 'Independent Verification Through Repeated Measurements', 'Conservative Conclusion Under Stated Boundary Conditions'],
      ['Comparison Category With Distinguishing Characteristics', 'Parallel Conversion Through Coordinated Stages', 'Processed Result Delivered To The Receiving Compartment', 'Independent Verification Through Repeated Measurements', 'Conservative Conclusion Under Stated Boundary Conditions'],
      ['Control Category With Distinguishing Characteristics', 'Selective Conversion Through Coordinated Stages', 'Final Result Delivered To The Receiving Compartment', 'Independent Verification Through Repeated Measurements', 'Conservative Conclusion Under Stated Boundary Conditions'],
    ];
    const result = await compile([
      'kind: matrix',
      `headers: ${headers.join(', ')}`,
      ...rows.map((row) => `row: ${row.join(', ')}`),
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const expected = new Map<string, string>();
    headers.forEach((header, column) => expected.set(`table-header-${column}`, header));
    rows.forEach((row, rowIndex) => row.forEach((cell, column) => expected.set(`table-cell-${rowIndex}-${column}`, cell)));
    let wrappedLabelCount = 0;
    for (const [prefix, source] of expected) {
      const labels = result.scene.labels
        .filter((label) => label.id === prefix || label.id.startsWith(`${prefix}-line-`) || label.id.startsWith(`${prefix}-panel-`))
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      expect(labels, prefix).not.toHaveLength(0);
      const lines = labels.map(textOf);
      if (lines.length > 1) wrappedLabelCount += 1;
      expect(lines.join(' '), prefix).toBe(source);
      expect(lines.every((line) => line.trim().length > 0), prefix).toBe(true);
    }
    expect(wrappedLabelCount).toBeGreaterThan(0);
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTableLabelsInsideCells(result.scene, laid);
  });

  it('repeats stable row keys in every responsive field tile', async () => {
    const rowKeys = ['Entity Alpha', 'Entity Beta', 'Entity Gamma'];
    const result = await compile([
      'kind: matrix',
      'headers: Entity, Location And Context, Transformation Mechanism, Resulting Product, Entry Route And Destination',
      'row: Entity Alpha, Initial Location With Supporting Context, Sequential Transformation Through Coordinated Stages, Structured Product With Distinguishing Characteristics, Dedicated Entry Route To The Receiving Destination',
      'row: Entity Beta, Separate Location With Supporting Context, Parallel Transformation Through Coordinated Stages, Processed Product With Distinguishing Characteristics, Dedicated Entry Route To The Receiving Destination',
      'row: Entity Gamma, Primary Location With Supporting Context, Selective Transformation Through Coordinated Stages, Final Product With Distinguishing Characteristics, Dedicated Entry Route To The Receiving Destination',
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTiledPanelsPreserveRowIdentity(result.scene, laid, rowKeys);
  });

  it('keeps every verbose label inside its anchored cell across responsive tiles', async () => {
    const headers = [
      'Entity',
      'Starting Context And Preparation Conditions',
      'Primary Transformation Through Intermediate States',
      'Resulting Product And Usable Outcome',
      'Entry Route And Receiving Destination',
    ];
    const rows = [
      ['Entity Alpha', 'Initial Context Followed By Controlled Preparation', 'Sequential Transformation Through Coordinated Stages', 'Structured Product With Distinguishing Characteristics', 'Dedicated Entry Route To The Receiving Destination'],
      ['Entity Beta', 'Separate Context Followed By Controlled Preparation', 'Parallel Transformation Through Coordinated Stages', 'Processed Product With Distinguishing Characteristics', 'Dedicated Entry Route To The Receiving Destination'],
      ['Entity Gamma', 'Primary Context Followed By Controlled Preparation', 'Selective Transformation Through Coordinated Stages', 'Final Product With Distinguishing Characteristics', 'Dedicated Entry Route To The Receiving Destination'],
    ];
    const result = await compile([
      'kind: matrix',
      `headers: ${headers.join(', ')}`,
      ...rows.map((row) => `row: ${row.join(', ')}`),
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toMatchObject({ headers, rows });
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTableLabelsInsideCells(result.scene, laid);
  });

  it('keeps a verbose five-column comparison coherent or refuses it honestly', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: Entity, Starting Context And Preparation Conditions, Primary Transformation Through Intermediate States, Resulting Product And Usable Outcome, Entry Route And Receiving Destination',
      'row: Entity Alpha, Initial Context Followed By Controlled Preparation, Sequential Transformation Through Coordinated Stages, Structured Product With Distinguishing Characteristics, Dedicated Entry Route To The Receiving Destination',
      'row: Entity Beta, Separate Context Followed By Controlled Preparation, Parallel Transformation Through Coordinated Stages, Processed Product With Distinguishing Characteristics, Dedicated Entry Route To The Receiving Destination',
      'row: Entity Gamma, Primary Context Followed By Controlled Preparation, Selective Transformation Through Coordinated Stages, Final Product With Distinguishing Characteristics, Dedicated Entry Route To The Receiving Destination',
    ].join('\n'));

    if (!result.ok) {
      expect(result.code).toBe('unsatisfiable');
      return;
    }

    expect(extractTable(result.scene)).toMatchObject({
      headers: [
        'Entity',
        'Starting Context And Preparation Conditions',
        'Primary Transformation Through Intermediate States',
        'Resulting Product And Usable Outcome',
        'Entry Route And Receiving Destination',
      ],
      rows: [
        ['Entity Alpha', 'Initial Context Followed By Controlled Preparation', 'Sequential Transformation Through Coordinated Stages', 'Structured Product With Distinguishing Characteristics', 'Dedicated Entry Route To The Receiving Destination'],
        ['Entity Beta', 'Separate Context Followed By Controlled Preparation', 'Parallel Transformation Through Coordinated Stages', 'Processed Product With Distinguishing Characteristics', 'Dedicated Entry Route To The Receiving Destination'],
        ['Entity Gamma', 'Primary Context Followed By Controlled Preparation', 'Selective Transformation Through Coordinated Stages', 'Final Product With Distinguishing Characteristics', 'Dedicated Entry Route To The Receiving Destination'],
      ],
    });
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertCoherentFiveColumnMatrix(result.scene, laid);
  });

  it('widens any over-wide matrix coherently when verbose data, not headers, sets the minimum', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: Label, Conditions, Transformation, Characteristics, Destination',
      'row: Observed Classification With Distinguishable Traits, Initial Experimental Conditions Followed By Controlled Preparation, Sequential Transformation Through Several Coordinated Stages, Structured Input Produces Observable Characteristics, Dedicated Channel Carries The Result To Its Destination',
      'row: Comparison Classification With Distinguishable Traits, Separate Experimental Conditions Followed By Controlled Preparation, Parallel Transformation Through Several Coordinated Stages, Processed Input Produces Observable Characteristics, Dedicated Channel Carries The Result To Its Destination',
      'row: Control Classification With Distinguishable Traits, Primary Experimental Conditions Followed By Controlled Preparation, Targeted Transformation Through Several Coordinated Stages, Final Input Produces Observable Characteristics, Dedicated Channel Carries The Result To Its Destination',
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    expect(frameBounds(result.scene)).toHaveLength(1);
    expect(result.scene.width).toBeGreaterThan(300);
    assertCoherentFiveColumnMatrix(result.scene, laid);
  });

  it('keeps a finite four-column data slice in the compact matrix frame', async () => {
    const result = await compile([
      'kind: matrix',
      'headers: AB=00,AB=01,AB=11,AB=10',
      'row: C=0,0,1,1,0',
      'row: C=1,1,1,1,0',
      'highlight: C=1',
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({
      headers: ['AB=00', 'AB=01', 'AB=11', 'AB=10'],
      rows: [['C=0', '0', '1', '1', '0'], ['C=1', '1', '1', '1', '0']],
      highlights: ['table-cell-1-0-highlight'],
    });
    expect(frameBounds(result.scene)).toHaveLength(1);
    expect(result.scene.width).toBe(300);
    expect(result.scene.height).toBe(165);
  });

  it('freezes the iteration 128 digestive nutrient absorption matrix', async () => {
    const headers = [
      'Nutrient',
      'Digestive sites',
      'Key enzyme or secretion',
      'Substrate to final absorbable products',
      'Entry route',
    ];
    const rows = [
      [
        'Carbohydrates',
        'Mouth and small intestine',
        'Salivary amylase then pancreatic amylase and brush-border disaccharidases',
        'Starch and disaccharides to monosaccharides',
        'Blood capillaries in villi then hepatic portal vein',
      ],
      [
        'Proteins',
        'Stomach and small intestine',
        'Hydrochloric acid and pepsin then pancreatic proteases and peptidases',
        'Proteins to amino acids and some dipeptides or tripeptides',
        'Blood capillaries in villi then hepatic portal vein',
      ],
      [
        'Lipids',
        'Mainly small intestine',
        'Bile salts and pancreatic lipase',
        'Triglycerides to fatty acids and monoglycerides',
        'Lacteals as chylomicrons then lymph before blood',
      ],
    ];
    const result = await compile([
      'kind: matrix',
      `headers: ${headers.join(', ')}`,
      ...rows.map((row) => `row: ${row.join(', ')}`),
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({ headers, rows, highlights: [] });
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertLabelsInsideOwnedCells(result.scene, laid);
  });

  it('freezes the iteration 129 propositional equivalence truth table', async () => {
    const headers = ['p', 'q', 'p→q', '¬q', '¬p', '¬q→¬p', '(p→q)↔(¬q→¬p)'];
    const rows = [
      ['T', 'T', 'T', 'F', 'F', 'T', 'T'],
      ['T', 'F', 'F', 'T', 'F', 'T', 'T'],
      ['F', 'T', 'T', 'F', 'T', 'F', 'T'],
      ['F', 'F', 'T', 'T', 'T', 'T', 'T'],
    ];
    const result = await compile([
      'kind: matrix',
      `headers: ${headers.join(',')}`,
      ...rows.map((row) => `row: ${row.join(',')}`),
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({ headers, rows, highlights: [] });
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
  });

  it('freezes the iteration 131 PCR workflow table', async () => {
    const capsule = `@diagram id=f1 type=table
kind: matrix
headers: Stage; Temperature; Duration or cycle count; Molecular purpose
row: Initial denaturation; 95 °C; 3 min; Separate the starting DNA strands
row: Cycle denaturation; 95 °C; 30 s; Separate the newly formed DNA strands
row: Cycle annealing; 58 °C; 30 s; Bind the forward and reverse primers
row: Cycle extension; 72 °C; 60 s; Extend the primers with thermostable DNA polymerase
row: Repeat cycle; —; 30 cycles; Repeat denaturation annealing and extension
row: Final extension; 72 °C; 5 min; Complete partially extended products
row: Hold; 4 °C; until collection; Preserve the amplified product before collection
@enddiagram`;
    const headers = ['Stage', 'Temperature', 'Duration or cycle count', 'Molecular purpose'];
    const rows = [
      ['Initial denaturation', '95 °C', '3 min', 'Separate the starting DNA strands'],
      ['Cycle denaturation', '95 °C', '30 s', 'Separate the newly formed DNA strands'],
      ['Cycle annealing', '58 °C', '30 s', 'Bind the forward and reverse primers'],
      ['Cycle extension', '72 °C', '60 s', 'Extend the primers with thermostable DNA polymerase'],
      ['Repeat cycle', '—', '30 cycles', 'Repeat denaturation annealing and extension'],
      ['Final extension', '72 °C', '5 min', 'Complete partially extended products'],
      ['Hold', '4 °C', 'until collection', 'Preserve the amplified product before collection'],
    ];
    const content = capsule.split('\n').slice(1, -1).join('\n');
    const result = await compile(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(certificate(result.scene, { headers, rows, highlights: [] })).toBe(true);
    expect(frameBounds(result.scene).length).toBeGreaterThan(0);
    expect(result.scene.width).toBeGreaterThanOrEqual(300);
    expect(result.scene.height).toBeGreaterThan(165);
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertLabelsInsideOwnedCells(result.scene, laid);
  });

  it('freezes the iteration 132 corrected protocol-rerun transition table', async () => {
    const content = `kind: matrix
headers: edge, D, Q(t), Q(t+1)
row: ↑, 0, 0, 0
row: ↑, 0, 1, 0
row: ↑, 1, 0, 1
row: ↑, 1, 1, 1`;
    const result = await compile(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({
      headers: ['edge', 'D', 'Q(t)', 'Q(t+1)'],
      rows: [
        ['↑', '0', '0', '0'],
        ['↑', '0', '1', '0'],
        ['↑', '1', '0', '1'],
        ['↑', '1', '1', '1'],
      ],
      highlights: [],
    });

    const frame = frameBounds(result.scene);
    expect(frame).toHaveLength(1);
    const tableFrame = frame[0];
    expect(tableFrame).toBeDefined();
    if (!tableFrame) return;
    expect(result.scene.strokes.filter((stroke) => {
      const [x1, y1, x2, y2] = stroke.points;
      return stroke.role === 'axis'
        && stroke.kind === 'line'
        && x1 === x2
        && y1 === tableFrame.y
        && y2 === tableFrame.y + tableFrame.h
        && x1! > tableFrame.x
        && x1! < tableFrame.x + tableFrame.w;
    })).toHaveLength(3);
    expect(result.scene.strokes.filter((stroke) => {
      const [x1, y1, x2, y2] = stroke.points;
      return stroke.role === 'axis'
        && stroke.kind === 'line'
        && y1 === y2
        && x1 === tableFrame.x
        && x2 === tableFrame.x + tableFrame.w
        && y1! > tableFrame.y
        && y1! < tableFrame.y + tableFrame.h;
    })).toHaveLength(4);

    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertLabelsInsideOwnedCells(result.scene, laid);
  });

  it('keeps a uniform dynamic-programming matrix in one coherent rectangle', async () => {
    const headers = ['n\\k', '0', '1', '2', '3', '4', '5'];
    const rows = [
      ['n=0', '1', '0', '0', '0', '0', '0'],
      ['n=1', '1', '1', '0', '0', '0', '0'],
      ['n=2', '1', '2', '1', '0', '0', '0'],
      ['n=3', '1', '3', '3', '1', '0', '0'],
      ['n=4', '1', '4', '6', '4', '1', '0'],
      ['n=5', '1', '5', '10', '10', '5', '1'],
    ];
    const result = await compile([
      'kind: dp',
      `headers: ${headers.join(', ')}`,
      ...rows.map((row) => `row: ${row.join(', ')}`),
    ].join('\n'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({ headers, rows, highlights: [] });
    const frames = frameBounds(result.scene);
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    expect(frame).toBeDefined();
    if (!frame) return;
    expect(result.scene.strokes.filter((stroke) => {
      const [x1, y1, x2, y2] = stroke.points;
      return stroke.role === 'axis'
        && stroke.kind === 'line'
        && x1 !== undefined
        && y1 !== undefined
        && x2 !== undefined
        && y2 !== undefined
        && x1 === x2
        && y1 === frame.y
        && y2 === frame.y + frame.h
        && x1 > frame.x
        && x1 < frame.x + frame.w;
    })).toHaveLength(headers.length - 1);
    expect(result.scene.strokes.filter((stroke) => {
      const [x1, y1, x2, y2] = stroke.points;
      return stroke.role === 'axis'
        && stroke.kind === 'line'
        && x1 !== undefined
        && y1 !== undefined
        && x2 !== undefined
        && y2 !== undefined
        && y1 === y2
        && x1 === frame.x
        && x2 === frame.x + frame.w
        && y1 > frame.y
        && y1 < frame.y + frame.h;
    })).toHaveLength(rows.length);
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertLabelsInsideOwnedCells(result.scene, laid);
  });

  it('freezes the iteration 134 SJF scheduling matrix', async () => {
    const content = `kind: matrix
headers: Process, arrival, burst, start, finish, turnaround, waiting
row: P1, 0, 7, 0, 7, 7, 0
row: P2, 2, 4, 10, 14, 12, 8
row: P3, 3, 1, 7, 8, 5, 4
row: P4, 5, 2, 8, 10, 5, 3`;
    const result = await compile(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({
      headers: ['Process', 'arrival', 'burst', 'start', 'finish', 'turnaround', 'waiting'],
      rows: [
        ['P1', '0', '7', '0', '7', '7', '0'],
        ['P2', '2', '4', '10', '14', '12', '8'],
        ['P3', '3', '1', '7', '8', '5', '4'],
        ['P4', '5', '2', '8', '10', '5', '3'],
      ],
      highlights: [],
    });

    expect(frameBounds(result.scene)).toHaveLength(7);
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTiledPanelsPreserveRowIdentity(result.scene, laid, ['P1', 'P2', 'P3', 'P4']);
  });

  it('freezes the iteration 135 right-triangle relation matrix', async () => {
    const content = `kind: matrix
headers: object, relation, value
row: opposite leg, o, 7 cm
row: adjacent leg, a, 24 cm
row: chosen angle, theta, arctan(7/24) = 16.26 deg
row: other acute angle, phi, 90 deg - theta = 73.74 deg`;
    const result = await compile(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({
      headers: ['object', 'relation', 'value'],
      rows: [
        ['opposite leg', 'o', '7 cm'],
        ['adjacent leg', 'a', '24 cm'],
        ['chosen angle', 'theta', 'arctan(7/24) = 16.26 deg'],
        ['other acute angle', 'phi', '90 deg - theta = 73.74 deg'],
      ],
      highlights: [],
    });
    expect(frameBounds(result.scene)).toHaveLength(1);
    expect(result.scene.width).toBe(300);
    expect(result.scene.height).toBe(165);
    expect(result.scene.strokes.filter((stroke) => stroke.role === 'axis' && stroke.kind === 'line')).toHaveLength(6);
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTableLabelsInsideCells(result.scene, laid);
  });

  it('freezes the iteration 136 input-state matrix', async () => {
    const content = `kind: matrix
headers: input, a, b, c
row: 1, 1, 0, 0
row: 2, 0, 1, 0
row: 3, 0, 1, 0`;
    const result = await compile(content);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(extractTable(result.scene)).toEqual({
      headers: ['input', 'a', 'b', 'c'],
      rows: [
        ['1', '1', '0', '0'],
        ['2', '0', '1', '0'],
        ['3', '0', '1', '0'],
      ],
      highlights: [],
    });

    const frames = frameBounds(result.scene);
    expect(frames).toHaveLength(1);
    const frame = frames[0];
    expect(frame).toBeDefined();
    if (!frame) return;
    expect(result.scene.width).toBe(300);
    expect(result.scene.height).toBe(165);
    expect(result.scene.strokes.filter((stroke) => {
      const [x1, y1, x2, y2] = stroke.points;
      return stroke.role === 'axis'
        && stroke.kind === 'line'
        && x1 !== undefined
        && y1 !== undefined
        && x2 !== undefined
        && y2 !== undefined
        && x1 === x2
        && y1 === frame.y
        && y2 === frame.y + frame.h
        && x1 > frame.x
        && x1 < frame.x + frame.w;
    })).toHaveLength(3);
    expect(result.scene.strokes.filter((stroke) => {
      const [x1, y1, x2, y2] = stroke.points;
      return stroke.role === 'axis'
        && stroke.kind === 'line'
        && x1 !== undefined
        && y1 !== undefined
        && x2 !== undefined
        && y2 !== undefined
        && y1 === y2
        && x1 === frame.x
        && x2 === frame.x + frame.w
        && y1 > frame.y
        && y1 < frame.y + frame.h;
    })).toHaveLength(3);

    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    assertTableLabelsInsideCells(result.scene, laid);
  });

});
