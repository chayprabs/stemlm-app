import type { SceneBuilder } from '../scene-build';
import type { Device } from './circuit';

export type Transistor = NonNullable<Device['transistor']>;

export function displayDeviceValue(device: Device): string | undefined {
  if (!device.value) return undefined;
  // Preserve authored units while making compact resistor notation readable;
  // a bare value remains bare rather than gaining an inferred unit.
  if (device.kind === 'r' && /Ω$/u.test(device.value.trim())) {
    return `${device.value.trim().replace(/\s*Ω$/u, '')} Ω`;
  }
  return device.value;
}

function ieeeZigzag(x: number, y: number, horiz: boolean, half: number): number[] {
  const h = Math.max(12, half);
  if (horiz) {
    return [x - h, y, x - h * 0.66, y - 6, x - h * 0.33, y + 6, x, y - 6, x + h * 0.33, y + 6, x + h * 0.66, y - 6, x + h, y];
  }
  return [x, y - h, x - 6, y - h * 0.66, x + 6, y - h * 0.33, x, y, x - 6, y + h * 0.33, x + 6, y + h * 0.66, x, y + h];
}

export function drawGlyph(
  b: SceneBuilder,
  d: Device,
  x: number,
  y: number,
  horiz: boolean,
  std: string,
  half: number,
  direction: 'right' | 'left' | 'down' | 'up' = 'right',
): void {
  const iec = std === 'iec';
  if (d.kind === 'r') {
    if (iec) {
      if (horiz) b.rect(d.id, x - half, y - 7, half * 2, 14, { fill: 'none', role: 'geometry', width: 1.8 });
      else b.rect(d.id, x - 7, y - half, 14, half * 2, { fill: 'none', role: 'geometry', width: 1.8 });
    } else b.polyline(d.id, ieeeZigzag(x, y, horiz, half), { role: 'geometry', width: 1.8 });
    return;
  }
  if (d.kind === 'c') {
    if (horiz) {
      b.line(d.id, x - 5, y - 12, x - 5, y + 12, { role: 'geometry', width: 2 });
      b.line(`${d.id}-b`, x + 5, y - 12, x + 5, y + 12, { role: 'geometry', width: 2 });
    } else {
      b.line(d.id, x - 12, y - 5, x + 12, y - 5, { role: 'geometry', width: 2 });
      b.line(`${d.id}-b`, x - 12, y + 5, x + 12, y + 5, { role: 'geometry', width: 2 });
    }
    return;
  }
  if (d.kind === 'l') {
    // Four same-side loops centred on the device, spanning exactly ±half so both leads meet it.
    const loop = (half * 2) / 4;
    const r = loop / 2;
    if (horiz) b.path(d.id, `M ${x - half} ${y}${` a ${r} ${r} 0 0 1 ${loop} 0`.repeat(4)}`, { role: 'geometry', width: 1.8 });
    else b.path(d.id, `M ${x} ${y - half}${` a ${r} ${r} 0 0 1 0 ${loop}`.repeat(4)}`, { role: 'geometry', width: 1.8 });
    return;
  }
  if (d.kind === 'v') {
    b.circle(d.id, x, y, Math.min(15, half), { role: 'geometry' });
    if (/^ac(?:\s|$)/i.test(d.value ?? '')) {
      b.path(`${d.id}-ac`, `M ${x - 6} ${y} q 3 -7 6 0 q 3 7 6 0`, { role: 'geometry', width: 1.6 });
    } else {
      // Stacked marks sit 7.5 px off centre: their line boxes stay apart, their ink stays inside the circle.
      const n1Positive = direction === 'right' || direction === 'down';
      const positiveX = horiz ? x + (n1Positive ? -6 : 6) : x;
      const positiveY = horiz ? y : y + (n1Positive ? -7.5 : 7.5);
      const negativeX = horiz ? x + (n1Positive ? 6 : -6) : x;
      const negativeY = horiz ? y : y + (n1Positive ? 7.5 : -7.5);
      b.label(`${d.id}-plus`, '+', positiveX, positiveY, { protected: true, priority: 'optional' });
      b.label(`${d.id}-minus`, '−', negativeX, negativeY, { protected: true, priority: 'optional' });
    }
    return;
  }
  if (d.kind === 'i') {
    b.circle(`${d.id}-body`, x, y, Math.min(12, half), { role: 'geometry' });
    if (horiz) {
      const leftToRight = direction !== 'left';
      b.line(d.id, x + (leftToRight ? -6 : 6), y, x + (leftToRight ? 6 : -6), y, { color: 'accent', role: 'connector', markerEnd: true, width: 1.4 });
    } else {
      const topToBottom = direction !== 'up';
      b.line(d.id, x, y + (topToBottom ? -6 : 6), x, y + (topToBottom ? 6 : -6), { color: 'accent', role: 'connector', markerEnd: true, width: 1.4 });
    }
    return;
  }
  if (d.kind === 'm') {
    b.circle(d.id, x, y, Math.min(12, half), { role: 'geometry' });
    b.label(`${d.id}-meter`, 'M', x, y, { protected: true, priority: 'optional' });
    return;
  }
  if (d.kind === 's') {
    if (horiz) {
      b.line(d.id, x - half, y, x - 5, y, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-blade`, x - 5, y, x + 6, d.switchState === 'closed' ? y : y - 7, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-right`, x + 6, y, x + half, y, { role: 'geometry', width: 1.8 });
    } else {
      b.line(d.id, x, y - half, x, y - 5, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-blade`, x, y - 5, d.switchState === 'closed' ? x : x + 7, y + 6, { role: 'geometry', width: 1.8 });
      b.line(`${d.id}-right`, x, y + 6, x, y + half, { role: 'geometry', width: 1.8 });
    }
    // Hollow contacts: the blade pivots on the first and meets (closed) or misses (open) the second.
    b.circle(`${d.id}-contact`, horiz ? x - 5 : x, horiz ? y : y - 5, 2.2, { role: 'geometry', fill: 'paper', width: 1.4 });
    b.circle(`${d.id}-contact-b`, horiz ? x + 6 : x, horiz ? y : y + 6, 2.2, { role: 'geometry', fill: 'paper', width: 1.4 });
    return;
  }
  if (d.kind === 'd') {
    if (horiz) {
      const right = direction !== 'left';
      b.polygon(d.id, right ? [x - 8, y - 10, x - 8, y + 10, x + 8, y] : [x + 8, y - 10, x + 8, y + 10, x - 8, y], { fill: 'none', role: 'geometry' });
      const barX = x + (right ? 8 : -8);
      b.line(`${d.id}-bar`, barX, y - 10, barX, y + 10, { role: 'geometry', width: 2 });
    } else {
      const down = direction !== 'up';
      b.polygon(d.id, down ? [x - 10, y - 8, x + 10, y - 8, x, y + 8] : [x - 10, y + 8, x + 10, y + 8, x, y - 8], { fill: 'none', role: 'geometry' });
      const barY = y + (down ? 8 : -8);
      b.line(`${d.id}-bar`, x - 10, barY, x + 10, barY, { role: 'geometry', width: 2 });
    }
    return;
  }
  if (d.kind === 'a') {
    const left = direction === 'left';
    b.polygon(
      d.id,
      left ? [x + 17, y - 16, x + 17, y + 16, x - 18, y] : [x - 17, y - 16, x - 17, y + 16, x + 18, y],
      { fill: 'none', role: 'geometry', width: 1.8 },
    );
    b.label(`${d.id}-plus`, '+', x + (left ? 11 : -11), y - 7, { protected: true, priority: 'optional' });
    b.label(`${d.id}-minus`, '−', x + (left ? 11 : -11), y + 7, { protected: true, priority: 'optional' });
    return;
  }
  b.polygon(d.id, [x - 12, y - 14, x - 12, y + 14, x + 13, y], { fill: 'none', role: 'geometry', width: 1.8 });
}

export function deviceHalf(d: Device, horiz: boolean): number {
  if (d.kind === 'v') return 15;
  if (d.kind === 'i' || d.kind === 'm') return 12;
  if (d.kind === 'c') return 6;
  if (d.kind === 'd') return 8;
  if (d.kind === 'l') return 24;
  return horiz ? 20 : 16;
}

/** Half-extent of a two-terminal glyph across its axis (for spacing and collision boxes). */
export function deviceSide(d: Device): number {
  if (d.kind === 'v') return 15;
  if (d.kind === 'i' || d.kind === 'm' || d.kind === 'c') return 12;
  if (d.kind === 'd') return 10;
  if (d.kind === 's') return 8;
  return 7;
}

/** Transistor geometry shared by the glyph and the layout: the control lead ends `CONTROL_REACH` left of the column. */
export const CONTROL_REACH = 24;

function arrowHead(b: SceneBuilder, id: string, fromX: number, fromY: number, toX: number, toY: number): void {
  // A filled head whose tip sits at `to`, pointing from `from` toward `to`.
  const length = Math.hypot(toX - fromX, toY - fromY) || 1;
  const ux = (toX - fromX) / length;
  const uy = (toY - fromY) / length;
  const baseX = toX - ux * 6;
  const baseY = toY - uy * 6;
  b.polygon(id, [toX, toY, baseX - uy * 3.2, baseY + ux * 3.2, baseX + uy * 3.2, baseY - ux * 3.2], { fill: 'ink', role: 'geometry', width: 1 });
}

/**
 * An upright transistor in column `x`, body centred at `y`: the control lead runs in from `x - CONTROL_REACH`,
 * the upper and lower terminals leave the body at `x` and are extended to their pins by the caller.
 * BJT: base bar, collector/emitter diagonals, emitter arrow out (npn) or in (pnp), envelope circle.
 * MOSFET (enhancement): gate plate, broken channel, drain/source stubs, source arrow out (nmos) or in (pmos).
 * Returns where the upper and lower terminals leave the body and where the control lead meets it.
 */
export function drawTransistor(b: SceneBuilder, id: string, kind: Transistor, x: number, y: number): { upperY: number; lowerY: number; controlX: number } {
  const bipolar = kind === 'npn' || kind === 'pnp';
  if (bipolar) {
    const barX = x - 10;
    b.circle(id, x - 3, y, 15, { role: 'geometry', width: 1.4 });
    b.line(`${id}-bar`, barX, y - 10, barX, y + 10, { role: 'geometry', width: 2.4 });
    b.line(`${id}-up`, barX, y - 5, x, y - 12, { role: 'geometry', width: 1.6 });
    b.line(`${id}-down`, barX, y + 5, x, y + 12, { role: 'geometry', width: 1.6 });
    // The emitter is the lower diagonal of an npn and the upper one of a pnp.
    if (kind === 'npn') arrowHead(b, `${id}-arrow`, barX, y + 5, x - 1.5, y + 11);
    else arrowHead(b, `${id}-arrow`, x, y - 12, barX + 1.5, y - 6);
    return { upperY: y - 12, lowerY: y + 12, controlX: barX };
  }
  const plateX = x - 13;
  const channelX = x - 8;
  b.line(`${id}-gate`, plateX, y - 11, plateX, y + 11, { role: 'geometry', width: 2 });
  b.line(id, channelX, y - 13, channelX, y - 5, { role: 'geometry', width: 2.4 });
  b.line(`${id}-channel-mid`, channelX, y - 3.5, channelX, y + 3.5, { role: 'geometry', width: 2.4 });
  b.line(`${id}-channel-low`, channelX, y + 5, channelX, y + 13, { role: 'geometry', width: 2.4 });
  b.line(`${id}-up`, channelX, y - 9, x, y - 9, { role: 'geometry', width: 1.6 });
  b.line(`${id}-down`, channelX, y + 9, x, y + 9, { role: 'geometry', width: 1.6 });
  // The source is the lower stub of an nmos (arrow out) and the upper stub of a pmos (arrow in).
  if (kind === 'nmos') arrowHead(b, `${id}-arrow`, channelX, y + 9, x - 0.5, y + 9);
  else arrowHead(b, `${id}-arrow`, x, y - 9, channelX + 0.5, y - 9);
  return { upperY: y - 9, lowerY: y + 9, controlX: plateX };
}
