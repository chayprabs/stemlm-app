import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specList, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { measureText } from '../geom';
import { FONT_FLOOR, FONT_MIN } from '../types';

const COMMON_KEYS = new Set(['kind', 'highlight', 'highlight_row', 'caption']);
const MATRIX_KEYS = new Set(['headers', 'header', 'row', 'rows']);
const ICE_KEYS = new Set(['species', 'i', 'c', 'e']);
const PUNNETT_KEYS = new Set(['cols', 'columns', 'rows', 'cells']);
const TABLE_MIN_COLUMN_WIDTH = 28;
const TABLE_LABEL_LINE_GAP = 4;
const TABLE_CELL_INSET = 6;

function failure(code: 'malformed' | 'refused' | 'unsatisfiable', reason: string): CompileResult {
  return { ok: false, code, reason };
}

/** Comma-separated cells are canonical; generated rows also use semicolons as delimiters. */
function parseTableCsv(value: string): string[] {
  if (!value.trim()) return [];
  const delimiter = value.includes(',') ? ',' : ';';
  return value.split(delimiter).map((cell) => cell.trim());
}

function presentKeys(spec: SpecDoc): Set<string> {
  return new Set([...spec.values.keys(), ...spec.lists.keys()]);
}

function unsupportedKeys(spec: SpecDoc, allowed: Set<string>): string[] {
  return [...presentKeys(spec)].filter((key) => !allowed.has(key));
}

function hasPipeDelimitedTableData(spec: SpecDoc): boolean {
  return ['headers', 'header', 'row'].some((key) => [
    ...specGetAll(spec, key),
    ...(spec.lists.get(key) ?? []),
  ].some((value) => value.includes('|')));
}

function isMath(text: string): boolean {
  return /^\$[\s\S]*\$$/.test(text.trim());
}

function cellMeasure(text: string, fontSize: number): { w: number; h: number } {
  return measureText(text, fontSize, isMath(text));
}

function matchingHighlight(value: string, ids: string[], highlights: string[], exactValues: Set<string>): boolean {
  return highlights.some((highlight) => {
    if (ids.some((id) => id.toLowerCase() === highlight.toLowerCase())) return true;
    if (highlight === value) return true;
    if (exactValues.has(highlight)) return false;
    return highlight.toLowerCase() === value.toLowerCase();
  });
}

function preferredCellWidth(text: string, fontSize: number): number {
  const parts: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    if (/[;,:/()[\]{}_\-]/.test(text[index]!)) {
      const part = text.slice(start, index + 1).trim();
      if (part) parts.push(part);
      start = index + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) parts.push(tail);
  const chunks = parts.length ? parts : [text];
  const adjacentPairs = chunks.slice(0, -1).map((part, index) => `${part} ${chunks[index + 1]!}`);
  return Math.max(...[...chunks, ...adjacentPairs].map((part) => cellMeasure(part, fontSize).w));
}

function minimumCellWidth(text: string, fontSize: number): number {
  if (isMath(text)) return cellMeasure(text, fontSize).w;
  const chunks: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\s|[;,:/()[\]{}_\-]/.test(text[index]!)) {
      const chunk = text.slice(start, index + 1).trim();
      if (chunk) chunks.push(chunk);
      start = index + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) chunks.push(tail);
  return Math.max(...(chunks.length ? chunks : [text]).map((chunk) => cellMeasure(chunk, fontSize).w));
}

function hasLeadingRowKeyColumn(headers: string[], rows: string[][], columnCount: number): boolean {
  return headers.length > 0
    && headers.length + 1 === columnCount
    && rows.length > 0
    && rows.every((row) => row.length === columnCount);
}

function columnWidths(
  headers: string[],
  rows: string[][],
  columnCount: number,
  available: number,
  fontSize: number,
): number[] | null {
  if (columnCount <= 0 || available < TABLE_MIN_COLUMN_WIDTH * columnCount) return null;
  const widths = Array.from({ length: columnCount }, () => TABLE_MIN_COLUMN_WIDTH);
  const minimums = Array.from({ length: columnCount }, () => TABLE_MIN_COLUMN_WIDTH);
  const update = (value: string, column: number) => {
    if (column >= columnCount) return;
    widths[column] = Math.max(widths[column]!, preferredCellWidth(value, fontSize) + 12);
    minimums[column] = Math.max(minimums[column]!, minimumCellWidth(value, fontSize) + 12);
  };
  headers.forEach(update);
  rows.forEach((row) => row.forEach(update));
  const naturalWidth = widths.reduce((sum, width) => sum + width, 0);
  if (naturalWidth > available) {
    const minimumTotal = minimums.reduce((sum, width) => sum + width, 0);
    if (minimumTotal > available) return null;
    const remaining = available - minimumTotal;
    const weightTotal = widths.reduce((sum, width, column) => sum + Math.max(0, width - minimums[column]!), 0);
    if (!weightTotal) return minimums.map((width) => width + remaining / columnCount);
    return widths.map((width, column) => minimums[column]! + remaining * Math.max(0, width - minimums[column]!) / weightTotal);
  }
  const extra = available - naturalWidth;
  return widths.map((width) => width + extra / columnCount);
}

function minimumColumnWidths(
  headers: string[],
  rows: string[][],
  columnCount: number,
  fontSize: number,
  maxColumnWidth: number,
): number[] {
  const widths = Array.from({ length: columnCount }, () => TABLE_MIN_COLUMN_WIDTH);
  const headerOffset = hasLeadingRowKeyColumn(headers, rows, columnCount) ? 1 : 0;
  const update = (value: string, column: number) => {
    if (column >= 0 && column < columnCount) {
      widths[column] = Math.min(maxColumnWidth, Math.max(widths[column]!, minimumCellWidth(value, fontSize) + 12));
    }
  };
  headers.forEach((header, column) => update(header, column + headerOffset));
  rows.forEach((row) => row.forEach((value, cell) => update(value, rowCellColumn(row.length, cell, columnCount))));
  return widths;
}

function needsWideCoherentMatrix(
  headers: string[],
  rows: string[][],
  columnCount: number,
  available: number,
  fontSize: number,
): boolean {
  const uniformMatrix = headers.length === columnCount
    && rows.length > 0
    && rows.every((row) => row.length === columnCount);
  const minimums = minimumColumnWidths(headers, rows, columnCount, fontSize, Number.POSITIVE_INFINITY);
  const minimumWidth = minimums.reduce((sum, width) => sum + width, 0);
  const balancedMatrix = uniformMatrix && columnCount >= rows.length;
  if (balancedMatrix && minimumWidth <= available) return true;
  if (minimumWidth <= available) return false;
  const balancedColumnWidth = available / Math.max(1, Math.ceil(Math.sqrt(columnCount)));
  const columnsNeedingWidening = minimums.filter((width) => width > balancedColumnWidth).length;
  const contentRequiresWidening = columnsNeedingWidening > columnCount / 2;
  const completeVerboseHeader = headers.length === columnCount
    && headers.filter((header) => header.trim().split(/\s+/).length >= 5).length >= columnCount - 1;
  return contentRequiresWidening || completeVerboseHeader;
}

function splitColumns(widths: number[], available: number, gap: number, groupCount = 0): number[][] | null {
  if (groupCount > 0) {
    if (groupCount > widths.length || available <= 0) return null;
    const groups: number[][] = [];
    let next = 0;
    for (let group = 0; group < groupCount; group++) {
      const remainingColumns = widths.length - next;
      const remainingGroups = groupCount - group;
      let size = Math.ceil(remainingColumns / remainingGroups);
      while (size > 1 && widths.slice(next, next + size).reduce((sum, width) => sum + width, 0) + gap * (size - 1) > available) size--;
      if (widths.slice(next, next + size).reduce((sum, width) => sum + width, 0) + gap * (size - 1) > available) return null;
      groups.push(Array.from({ length: size }, (_, index) => next + index));
      next += size;
    }
    return next === widths.length ? groups : null;
  }
  const groups: number[][] = [];
  let group: number[] = [];
  let used = 0;
  for (const [column, width] of widths.entries()) {
    if (width > available) return null;
    if (group.length && used + gap + width > available) {
      groups.push(group);
      group = [];
      used = 0;
    }
    group.push(column);
    used += width;
  }
  if (group.length) groups.push(group);
  return groups;
}

/** A column tile remains identifiable when it is viewed independently. */
function preserveRowIdentity(columnGroups: number[][], columnCount: number): number[][];
function preserveRowIdentity(columnGroups: number[][] | null, columnCount: number): number[][] | null;
function preserveRowIdentity(columnGroups: number[][] | null, columnCount: number): number[][] | null {
  if (!columnGroups || columnGroups.length <= 1 || columnCount <= 1) return columnGroups;
  return columnGroups.map((group) => group.includes(0) ? group : [0, ...group]);
}

function splitRows(rowCount: number, groupCount: number): number[][] {
  if (!rowCount) return [[]];
  const groups: number[][] = [];
  let next = 0;
  for (let group = 0; group < groupCount; group++) {
    const size = Math.ceil((rowCount - next) / (groupCount - group));
    groups.push(Array.from({ length: size }, (_, index) => next + index));
    next += size;
  }
  return groups;
}

function cellXBounds(widths: number[], x0: number): number[] {
  const bounds = [x0];
  for (const width of widths) bounds.push(bounds[bounds.length - 1]! + width);
  return bounds;
}

function rowCellColumn(rowLength: number, cellIndex: number, columnCount: number): number {
  if (cellIndex === 0 || rowLength <= 1 || columnCount <= 1) return cellIndex;
  const dataColumns = columnCount - 1;
  const dataCount = rowLength - 1;
  const start = Math.max(0, Math.floor((dataColumns - dataCount) / 2));
  return Math.min(columnCount - 1, 1 + start + cellIndex - 1);
}

function groupRows(rows: string[][], columnGroup: number[], columnCount: number): string[][] {
  return rows.map((row) => columnGroup.map((column) => {
    const cell = row.findIndex((_, index) => rowCellColumn(row.length, index, columnCount) === column);
    return cell < 0 ? '' : row[cell]!;
  }));
}

function wrapCell(text: string, width: number, fontSize: number): string[] | null {
  const available = Math.max(8, width - TABLE_CELL_INSET * 2);
  if (cellMeasure(text, fontSize).w <= available) return [text];
  if (isMath(text)) return null;

  const lines: string[] = [];
  let remaining = text.trim();
  while (remaining) {
    if (cellMeasure(remaining, fontSize).w <= available) {
      lines.push(remaining);
      break;
    }
    let best = 0;
    for (let end = 1; end <= remaining.length; end++) {
      if (cellMeasure(remaining.slice(0, end), fontSize).w > available) break;
      if (/\s|[;,:/()[\]{}_\-]/.test(remaining[end - 1]!)) best = end;
    }
    if (!best) return null;
    const line = remaining.slice(0, best).trim();
    if (!line) return null;
    lines.push(line);
    remaining = remaining.slice(best).trimStart();
  }
  return lines.length ? lines : [''];
}

function wrappedLabelHeight(text: string, width: number, fontSize: number): number | null {
  const lines = wrapCell(text, width, FONT_MIN);
  if (!lines) return null;
  return lines.reduce((sum, line) => sum + cellMeasure(line, fontSize).h, 0)
    + TABLE_LABEL_LINE_GAP * Math.max(0, lines.length - 1)
    + TABLE_CELL_INSET * 2;
}

function rowHeightsFor(
  headers: string[],
  rows: string[][],
  rowGroups: number[][],
  columnGroups: number[][],
  columnCount: number,
  tileW: number,
  tileH: number,
  fontSize: number,
  includeHeaders: boolean,
): number[][] | null {
  const lineHeight = cellMeasure('', fontSize).h;
  const headerOffset = hasLeadingRowKeyColumn(headers, rows, columnCount) ? 1 : 0;
  const result: number[][] = [];
  for (const columnGroup of columnGroups) {
    const groupHeaders = columnGroup.map((column) => headers[column - headerOffset] ?? '');
    const widths = columnWidths(groupHeaders, groupRows(rows, columnGroup, columnCount), columnGroup.length, tileW, FONT_MIN);
    if (!widths) {
      return null;
    }
    for (const [rowGroupIndex, rowGroup] of rowGroups.entries()) {
      const heights = result[rowGroupIndex] ?? Array.from({ length: rowGroup.length + (includeHeaders ? 1 : 0) }, () => lineHeight + 2);
      if (includeHeaders) {
        const headerHeight = Math.max(...columnGroup.map((column, localColumn) => {
          const text = headers[column - headerOffset] ?? '';
          const height = wrappedLabelHeight(text, widths[localColumn]!, fontSize);
          return height ?? Number.POSITIVE_INFINITY;
        }), lineHeight + 2);
        heights[0] = Math.max(heights[0]!, headerHeight);
      }
      for (const [localRow, rowIndex] of rowGroup.entries()) {
        const row = rows[rowIndex]!;
        const cellHeight = Math.max(...columnGroup.map((column, localColumn) => {
          const cell = row.findIndex((_, index) => rowCellColumn(row.length, index, columnCount) === column);
          const text = cell < 0 ? '' : row[cell]!;
          return wrappedLabelHeight(text, widths[localColumn]!, fontSize) ?? Number.POSITIVE_INFINITY;
        }), lineHeight + 2);
        const heightIndex = localRow + (includeHeaders ? 1 : 0);
        heights[heightIndex] = Math.max(heights[heightIndex]!, cellHeight);
      }
      result[rowGroupIndex] = heights;
    }
  }
  for (const heights of result) {
      const requiredHeight = heights.reduce((sum, height) => sum + height, 0);
    if (!Number.isFinite(requiredHeight) || requiredHeight > tileH) {
      return null;
    }
    if (Number.isFinite(tileH)) {
      const extra = (tileH - requiredHeight) / heights.length;
      for (const [index, height] of heights.entries()) heights[index] = height + extra;
    }
  }
  return result;
}

export function compileTable(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('table', w, h);
  const kind = (specGet(spec, 'kind') ?? 'matrix').toLowerCase();
  let headers: string[] = [];
  let rows: string[][] = [];

  if (kind === 'ice') {
    const invalid = unsupportedKeys(spec, new Set([...COMMON_KEYS, ...ICE_KEYS]));
    if (invalid.length) return failure('malformed', `table_unsupported_key:${invalid.join(',')}`);
    const species = parseTableCsv(specGet(spec, 'species') ?? '');
    const initial = parseTableCsv(specGet(spec, 'I') ?? specGet(spec, 'i') ?? '');
    const change = parseTableCsv(specGet(spec, 'C') ?? specGet(spec, 'c') ?? '');
    const equilibrium = parseTableCsv(specGet(spec, 'E') ?? specGet(spec, 'e') ?? '');
    if (!species.length || initial.length !== species.length || change.length !== species.length || equilibrium.length !== species.length) {
      return failure('malformed', 'table_ice_vectors_must_match_species');
    }
    headers = ['', ...species];
    rows = [
      ['I', ...initial],
      ['C', ...change],
      ['E', ...equilibrium],
    ];
  } else if (kind === 'punnett') {
    const invalid = unsupportedKeys(spec, new Set([...COMMON_KEYS, ...PUNNETT_KEYS]));
    if (invalid.length) return failure('malformed', `table_unsupported_key:${invalid.join(',')}`);
    const cols = parseTableCsv(specGet(spec, 'cols') ?? specGet(spec, 'columns') ?? '');
    const rws = parseTableCsv(specGet(spec, 'rows') ?? '');
    headers = ['', ...cols];
    const cells = specList(spec, 'cells');
    if (!cols.length || !rws.length || cells.length !== rws.length) return failure('malformed', 'table_punnett_matrix_incomplete');
    for (const [i, rowLabel] of rws.entries()) {
      const rowCells = parseTableCsv(cells[i]!);
      if (rowCells.length !== cols.length) return failure('malformed', `table_punnett_row_${i}_cardinality`);
      rows.push([rowLabel, ...rowCells]);
    }
  } else if (kind === 'matrix' || kind === 'dp') {
    const invalid = unsupportedKeys(spec, new Set([...COMMON_KEYS, ...MATRIX_KEYS]));
    if (invalid.length) return failure('malformed', `table_unsupported_key:${invalid.join(',')}`);
    const headerValues = specGetAll(spec, 'headers');
    const headerAliasValues = specGetAll(spec, 'header');
    if (headerValues.length > 1 || headerAliasValues.length > 1 || (headerValues.length && headerAliasValues.length)) {
      return failure('malformed', 'table_multiple_header_rows_ambiguous');
    }
    if (hasPipeDelimitedTableData(spec)) {
      return failure('malformed', 'table_pipe_delimited_data_use_comma_or_semicolon');
    }
    const headerLine = headerValues[0] ?? headerAliasValues[0];
    headers = headerLine === undefined ? [] : parseTableCsv(headerLine);
    const rowLines = [...specGetAll(spec, 'row'), ...specList(spec, 'rows')];
    rows = rowLines.map(parseTableCsv);
  } else {
    return failure('refused', `table_unsupported_kind:${kind}`);
  }

  if (!headers.length && !rows.length) return failure('malformed', 'table_requires_headers_or_rows');
  const cols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  if (headers.length > cols || rows.some((row) => row.length > cols)) return failure('malformed', 'table_invalid_cardinality');
  const caption = spec.caption?.trim() ?? '';
  const captionBand = caption ? 20 : 0;
  const gridW = w - 24;
  const gridH = h - 24 - captionBand;
  if (gridH <= 0) return failure('unsatisfiable', 'table_content_exceeds_frame');
  const panelGap = 8;
  const maxColumnWidth = Math.max(TABLE_MIN_COLUMN_WIDTH, gridW / Math.max(1, Math.ceil(Math.sqrt(cols))));
  const minimumWidths = minimumColumnWidths(headers, rows, cols, FONT_MIN, maxColumnWidth);
  let rowGroups: number[][] | null = null;
  let columnGroups: number[][] | null = null;
  let tileW = 0;
  let tileH = 0;
  let compactHeaders = false;
  let useFloorFont = false;
  let rowHeights: number[][] | null = null;
  let rowsAcross = false;
  let legacyTiling = false;
  const globalHeaderWidths = headers.length ? columnWidths(headers, [], headers.length, gridW, FONT_MIN) : null;
  const wrappingMinimumWidths = minimumWidths;
  const headerOffset = hasLeadingRowKeyColumn(headers, rows, cols) ? 1 : 0;
  for (let columnTileCount = 1; columnTileCount <= cols; columnTileCount++) {
    const candidateW = (gridW - panelGap * (columnTileCount - 1)) / columnTileCount;
    if (candidateW <= 0) continue;
    const candidateColumns = preserveRowIdentity(splitColumns(wrappingMinimumWidths, candidateW, 0, columnTileCount), cols);
    if (!candidateColumns) continue;
    for (let rowTileCount = 1; rowTileCount <= Math.max(1, rows.length); rowTileCount++) {
      const candidateH = (gridH - panelGap * (rowTileCount - 1)) / rowTileCount;
      if (candidateH <= 0) continue;
      const candidateRows = splitRows(rows.length, rowTileCount);
      const normalHeights = rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, candidateH, FONT_MIN, Boolean(headers.length));
      const floorHeights = normalHeights ? null : rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, candidateH, FONT_FLOOR, Boolean(headers.length));
      const compactHeight = (gridH - 20 - panelGap * (rowTileCount - 1)) / rowTileCount;
      const compactHeadersFit = candidateColumns.length === 1
        && headerOffset === 0
        && Boolean(globalHeaderWidths)
        && headers.every((header, column) => wrapCell(header, globalHeaderWidths![column]!, FONT_MIN)?.length === 1);
      const compactHeights = compactHeadersFit
        ? rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, compactHeight, FONT_FLOOR, false)
        : null;
      const selectedHeights = normalHeights ?? floorHeights ?? compactHeights;
      if (!selectedHeights) continue;
      rowGroups = candidateRows;
      columnGroups = candidateColumns;
      tileW = candidateW;
      tileH = candidateH;
      compactHeaders = !normalHeights && !floorHeights && Boolean(compactHeights);
      useFloorFont = !normalHeights && !compactHeaders;
      rowHeights = selectedHeights;
      if (compactHeaders) tileH = compactHeight;
      break;
    }
    if (rowGroups && columnGroups && rowHeights) break;
  }
  const wideMatrixRequired = (!rowGroups || !columnGroups || columnGroups.length > 1)
    && needsWideCoherentMatrix(headers, rows, cols, gridW, FONT_MIN);
  if (wideMatrixRequired) {
    const wideWidths = minimumColumnWidths(headers, rows, cols, FONT_MIN, gridW)
      .map((width) => width + TABLE_CELL_INSET * 4);
    const wideGridW = wideWidths.reduce((sum, width) => sum + width, 0);
    const coherentRows = [Array.from({ length: rows.length }, (_, row) => row)];
    const coherentColumns = [Array.from({ length: cols }, (_, column) => column)];
    const coherentHeights = rowHeightsFor(
      headers,
      rows,
      coherentRows,
      coherentColumns,
      cols,
      wideGridW,
      Number.POSITIVE_INFINITY,
      FONT_MIN,
      Boolean(headers.length),
    );
    const requiredHeight = coherentHeights?.[0]?.reduce((sum, height) => sum + height, 0);
    if (coherentHeights && requiredHeight !== undefined && Number.isFinite(requiredHeight)) {
      rowGroups = coherentRows;
      columnGroups = coherentColumns;
      tileW = wideGridW;
      tileH = requiredHeight;
      compactHeaders = false;
      useFloorFont = false;
      rowHeights = coherentHeights;
      rowsAcross = false;
      legacyTiling = false;
      b.width = Math.max(w, wideGridW + 24);
      b.height = Math.max(h, 24 + captionBand + requiredHeight, b.width + 1);
    }
    if (!rowGroups || !columnGroups || !rowHeights || rowGroups.length !== 1 || columnGroups.length !== 1 || columnGroups[0]!.length !== cols) {
      return failure('unsatisfiable', 'table_content_exceeds_frame');
    }
  }
  if (!rowGroups || !columnGroups || !rowHeights) {
    // Very tall tables remain readable when row chunks are independent panels
    // across the card. Their shared width plan keeps every panel's columns aligned.
    for (let rowTileCount = 1; rowTileCount <= Math.max(1, rows.length); rowTileCount++) {
      const candidateW = (gridW - panelGap * (rowTileCount - 1)) / rowTileCount;
      if (candidateW <= 0) continue;
      const candidateColumns = preserveRowIdentity(splitColumns(minimumWidths, candidateW, 0, 1), cols);
      if (!candidateColumns) continue;
      const candidateRows = splitRows(rows.length, rowTileCount);
      const normalHeights = rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, gridH, FONT_MIN, Boolean(headers.length));
      const floorHeights = normalHeights ? null : rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, gridH, FONT_FLOOR, Boolean(headers.length));
      const selectedHeights = normalHeights ?? floorHeights;
      if (!selectedHeights) continue;
      rowGroups = candidateRows;
      columnGroups = candidateColumns;
      tileW = candidateW;
      tileH = gridH;
      compactHeaders = false;
      useFloorFont = !normalHeights;
      rowHeights = selectedHeights;
      rowsAcross = true;
      break;
    }
  }
  if (!rowGroups || !columnGroups || !rowHeights) {
    // Preserve a readable last resort for very dense comparison tables. This
    // orientation is only selected after the aligned matrix layouts fail.
    for (let rowTileCount = 1; rowTileCount <= Math.max(1, rows.length); rowTileCount++) {
      const candidateW = (gridW - panelGap * (rowTileCount - 1)) / rowTileCount;
      if (candidateW <= 0) continue;
      const candidateColumns = preserveRowIdentity(splitColumns(minimumWidths, candidateW, 0), cols);
      if (!candidateColumns) continue;
      const candidateH = (gridH - panelGap * (candidateColumns.length - 1)) / candidateColumns.length;
      if (candidateH <= 0) continue;
      const candidateRows = splitRows(rows.length, rowTileCount);
      const normalHeights = rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, candidateH, FONT_MIN, Boolean(headers.length));
      const floorHeights = normalHeights ? null : rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, candidateH, FONT_FLOOR, Boolean(headers.length));
      const compactHeight = (gridH - 20 - panelGap * (candidateColumns.length - 1)) / candidateColumns.length;
      const compactHeadersFit = headerOffset === 0
        && Boolean(globalHeaderWidths)
        && headers.every((header, column) => wrapCell(header, globalHeaderWidths![column]!, FONT_MIN)?.length === 1);
      const compactHeights = compactHeadersFit
        ? rowHeightsFor(headers, rows, candidateRows, candidateColumns, cols, candidateW, compactHeight, FONT_FLOOR, false)
        : null;
      const selectedHeights = normalHeights ?? floorHeights ?? compactHeights;
      if (!selectedHeights) continue;
      rowGroups = candidateRows;
      columnGroups = candidateColumns;
      tileW = candidateW;
      tileH = candidateH;
      compactHeaders = !normalHeights && !floorHeights && Boolean(compactHeights);
      useFloorFont = !normalHeights && !compactHeaders;
      rowHeights = selectedHeights;
      if (compactHeaders) tileH = compactHeight;
      legacyTiling = true;
      break;
    }
  }
  if (!rowGroups || !columnGroups || !rowHeights) {
    // When several columns cannot share a readable fixed-width tile, stack
    // single-column panels vertically so phrases can wrap at word boundaries.
    if (cols > 1) {
      const stackedRows = [Array.from({ length: rows.length }, (_, row) => row)];
      const stackedColumns = preserveRowIdentity(Array.from({ length: cols }, (_, column) => [column]), cols);
      const stackedHeights = rowHeightsFor(
        headers,
        rows,
        stackedRows,
        stackedColumns,
        cols,
        gridW,
        Number.POSITIVE_INFINITY,
        FONT_MIN,
        Boolean(headers.length),
      );
      const panelHeight = stackedHeights?.[0]?.reduce((sum, height) => sum + height, 0);
      const stackedHeight = panelHeight === undefined ? undefined : panelHeight * cols + panelGap * (cols - 1);
      if (stackedHeights && panelHeight !== undefined && stackedHeight !== undefined && Number.isFinite(stackedHeight)) {
        rowGroups = stackedRows;
        columnGroups = stackedColumns;
        tileW = gridW;
        tileH = panelHeight;
        compactHeaders = false;
        useFloorFont = false;
        rowHeights = stackedHeights;
        rowsAcross = true;
        b.height = Math.max(h, 24 + captionBand + stackedHeight);
      }
    }
  }
  if (!rowGroups || !columnGroups || !rowHeights) {
    // If the fixed card cannot hold the wrapped rows, keep the table readable
    // by giving one coherent table the height its cells require.
    const adaptiveColumns = [Array.from({ length: cols }, (_, column) => column)];
    const adaptiveRows = [Array.from({ length: rows.length }, (_, row) => row)];
    const adaptiveHeights = rowHeightsFor(
      headers,
      rows,
      adaptiveRows,
      adaptiveColumns,
      cols,
      gridW,
      Number.POSITIVE_INFINITY,
      FONT_MIN,
      Boolean(headers.length),
    );
    const requiredHeight = adaptiveHeights?.[0]?.reduce((sum, height) => sum + height, 0);
    if (adaptiveHeights && requiredHeight !== undefined && Number.isFinite(requiredHeight)) {
      rowGroups = adaptiveRows;
      columnGroups = adaptiveColumns;
      tileW = gridW;
      tileH = requiredHeight;
      compactHeaders = false;
      useFloorFont = false;
      rowHeights = adaptiveHeights;
      b.height = Math.max(h, 24 + captionBand + requiredHeight);
    }
  }
  if (!rowGroups || !columnGroups || !rowHeights) return failure('unsatisfiable', 'table_rows_below_readable_height');
  const hlRow = (specGet(spec, 'highlight_row') ?? '').toLowerCase();
  const highlightIds: string[] = [];
  const exactHighlightValues = new Set(spec.highlight.filter((highlight) => [
    ...headers,
    ...rows.flat(),
  ].some((value) => value === highlight)));

  if (compactHeaders && globalHeaderWidths) {
    const headerBounds = cellXBounds(globalHeaderWidths, 12);
    const headerY = 12 + 10;
    b.rect('frame-header', 12, 12, gridW, 20, { color: 'neutral', role: 'axis' });
    for (const [column, cell] of headers.entries()) {
      const id = `table-header-${column}`;
      if (matchingHighlight(cell, [id], spec.highlight, exactHighlightValues)) {
        const highlightId = `${id}-highlight`;
        highlightIds.push(highlightId);
        b.rect(highlightId, headerBounds[column]! + 1, 13, globalHeaderWidths[column]! - 2, 18, { color: 'accent', role: 'annotation', width: 1.4 });
      }
      b.label(id, cell, (headerBounds[column]! + headerBounds[column + 1]!) / 2, headerY, { protected: true, priority: 'required', katex: isMath(cell) });
    }
    b.line('table-header-rule', 12, 32, 12 + gridW, 32, { color: 'muted', width: 1, role: 'axis' });
  }

  if (caption) {
    if (cellMeasure(caption, FONT_FLOOR).w > b.width - 24) return failure('unsatisfiable', 'table_caption_exceeds_frame');
    b.label('table-caption', caption, b.width / 2, b.height - 10, { protected: true, priority: 'preferred', katex: isMath(caption) });
  }

  const split = rowGroups.length > 1 || columnGroups.length > 1;
  const lineFontSize = compactHeaders || useFloorFont ? FONT_FLOOR : FONT_MIN;
  const rowGroupsAcross = rowsAcross || legacyTiling;
  for (const [rowGroupIndex, rowGroup] of rowGroups.entries()) {
    for (const [columnGroupIndex, columnGroup] of columnGroups.entries()) {
      const x0 = 12 + (rowGroupsAcross ? rowGroupIndex : columnGroupIndex) * (tileW + panelGap);
      const y0 = 12 + (compactHeaders ? 20 : 0) + (rowGroupsAcross ? columnGroupIndex : rowGroupIndex) * (tileH + panelGap);
      const groupHeaders = columnGroup.map((column) => headers[column - headerOffset] ?? '');
      const groupedRows = groupRows(rows, columnGroup, cols);
      const widths = columnWidths(groupHeaders, groupedRows, columnGroup.length, tileW, FONT_MIN);
      if (!widths) return failure('unsatisfiable', 'table_content_exceeds_frame');
      const xBounds = cellXBounds(widths, x0);
      const heights = rowHeights[rowGroupIndex]!;
      const rowTops = [0];
      for (const height of heights) rowTops.push(rowTops[rowTops.length - 1]! + height);
      const frameId = split ? `frame-${rowGroupIndex}-${columnGroupIndex}` : 'frame';
      b.rect(frameId, x0, y0, tileW, tileH, { color: 'neutral', role: 'axis' });
      if (split) b.panel(frameId, 'table', x0, y0, tileW, tileH);
      for (let c = 1; c < columnGroup.length; c++) {
        const groupedTail = headerOffset === 0 && headers.length > 0 && headers.length < cols && columnGroup[c]! >= headers.length;
        const top = groupedTail ? y0 + heights[0]! : y0;
        b.line(split ? `${frameId}-vc${c}` : `vc${c}`, xBounds[c]!, top, xBounds[c]!, y0 + tileH, { color: 'muted', width: 1, role: 'axis' });
      }
      for (let r = 1; r < heights.length; r++) b.line(split ? `${frameId}-hr${r}` : `hr${r}`, x0, y0 + rowTops[r]!, x0 + tileW, y0 + rowTops[r]!, { color: 'muted', width: 1, role: 'axis' });

      const paint = (text: string, c: number, rowTop: number, rowHeight: number, id: string, hl = false, spanEnd = c + 1): boolean => {
        const cellLeft = xBounds[c]!;
        const cellRight = xBounds[spanEnd]!;
        const cellTop = y0 + rowTop;
        const cellBottom = cellTop + rowHeight;
        const cellCenterX = (cellLeft + cellRight) / 2;
        const lines = wrapCell(text, cellRight - cellLeft, FONT_MIN);
        if (!lines) return false;
        if (hl) {
          const highlightId = `${id}-highlight`;
          highlightIds.push(highlightId);
          b.rect(highlightId, xBounds[c]! + 1, y0 + rowTop + 1, xBounds[spanEnd]! - xBounds[c]! - 2, rowHeight - 2, { color: 'accent', role: 'annotation', width: 1.4 });
        }
        const lineHeights = lines.map((line) => cellMeasure(line, lineFontSize).h);
        const contentHeight = lineHeights.reduce((sum, height) => sum + height, 0)
          + TABLE_LABEL_LINE_GAP * Math.max(0, lines.length - 1);
        const minContentTop = cellTop + TABLE_CELL_INSET;
        const maxContentTop = cellBottom - TABLE_CELL_INSET - contentHeight;
        if (maxContentTop + 1e-6 < minContentTop) return false;
        let lineTop = Math.max(minContentTop, Math.min((cellTop + cellBottom) / 2 - contentHeight / 2, Math.max(minContentTop, maxContentTop)));
        for (const [lineIndex, line] of lines.entries()) {
          const lineId = lines.length === 1 ? id : `${id}-line-${lineIndex}`;
          const lineWidth = cellMeasure(line, lineFontSize).w;
          const minLineX = cellLeft + TABLE_CELL_INSET + lineWidth / 2;
          const maxLineX = cellRight - TABLE_CELL_INSET - lineWidth / 2;
          if (maxLineX + 1e-6 < minLineX) return false;
          const lineX = Math.max(minLineX, Math.min(cellCenterX, Math.max(minLineX, maxLineX)));
          const lineY = lineTop + lineHeights[lineIndex]! / 2;
          b.label(lineId, line, lineX, lineY, { protected: true, priority: 'required', katex: isMath(line) });
          lineTop += lineHeights[lineIndex]! + TABLE_LABEL_LINE_GAP;
        }
        return true;
      };

      if (headers.length && !compactHeaders) {
        const groupedHeaderColumn = headerOffset === 0 && headers.length < cols ? headers.length - 1 : -1;
        for (const [localColumn, column] of columnGroup.entries()) {
          const isGroupedTail = groupedHeaderColumn >= 0 && column >= headers.length;
          if (isGroupedTail && column !== columnGroup.find((candidate) => candidate >= headers.length)) continue;
          const headerColumn = isGroupedTail ? groupedHeaderColumn : column - headerOffset;
          if (headerColumn < 0) continue;
          const cell = headers[headerColumn];
          if (cell === undefined) continue;
          const repeatedRowKey = column === 0 && columnGroupIndex > 0 && columnGroups.length > 1;
          const id = repeatedRowKey
            ? `table-row-key-header-${headerColumn}-panel-${rowGroupIndex}-${columnGroupIndex}`
            : (!split || (rowGroupIndex === 0 && columnGroupIndex === 0)) && headerColumn === column
            ? `table-header-${headerColumn}`
            : `table-header-${headerColumn}-panel-${rowGroupIndex}-${columnGroupIndex}`;
          const spanEnd = isGroupedTail || (headerOffset === 0 && headerColumn === headers.length - 1 && headers.length < cols)
            ? columnGroup.length
            : localColumn + 1;
          if (!paint(cell, localColumn, rowTops[0]!, heights[0]!, id, matchingHighlight(cell, [id], spec.highlight, exactHighlightValues), spanEnd)) {
            return failure('unsatisfiable', 'table_content_exceeds_frame');
          }
        }
      }
      for (const rowIndex of rowGroup) {
        const row = rows[rowIndex]!;
        const rowHl = hlRow && row[0]?.toLowerCase() === hlRow;
        for (const [cellIndex, cell] of row.entries()) {
          const column = rowCellColumn(row.length, cellIndex, cols);
          const localColumn = columnGroup.indexOf(column);
          if (localColumn < 0) continue;
          const localRow = rowGroup.indexOf(rowIndex) + (headers.length && !compactHeaders ? 1 : 0);
          const cellId = column === 0 && columnGroupIndex > 0 && columnGroups.length > 1
            ? `table-row-key-${rowIndex}-panel-${rowGroupIndex}-${columnGroupIndex}`
            : `table-cell-${rowIndex}-${cellIndex}`;
          if (!paint(cell, localColumn, rowTops[localRow]!, heights[localRow]!, cellId, rowHl || matchingHighlight(cell, [cellId], spec.highlight, exactHighlightValues))) {
            return failure('unsatisfiable', 'table_content_exceeds_frame');
          }
        }
      }
    }
  }
  b.hl([...spec.highlight, ...(hlRow ? [`row:${hlRow}`] : []), ...highlightIds]);
  return layoutAndCompile(b.scene());
}
