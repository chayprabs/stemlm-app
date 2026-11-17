import { describe, expect, it } from 'vitest';
import { boxesOverlap } from '../../geom';
import { SEQUENCE_MAX_ACTORS, SEQUENCE_MAX_EVENTS } from './sequence';
import { boxOf, draw, expectCleanLabels, reason } from './testing';

const TYPICAL = [
  'actor: client Client',
  'actor: server Server',
  'actor: db Database',
  'msg: client server GET /users',
  'msg: server db SELECT * FROM users',
  'reply: db server rows',
  'note: server validates token',
  'reply: server client 200 OK',
].join('\n');

const centerX = (points: number[]) => points[0]!;

describe('sequence diagram', () => {
  it('draws actors left to right and events top to bottom in source order', async () => {
    const drawn = await draw('sequence', TYPICAL);
    expect(['actor-label-0', 'actor-label-1', 'actor-label-2'].map(drawn.text)).toEqual(['Client', 'Server', 'Database']);
    const lifelines = [0, 1, 2].map((i) => centerX(drawn.stroke(`lifeline-${i}`)!.points));
    expect(lifelines[0]!).toBeLessThan(lifelines[1]!);
    expect(lifelines[1]!).toBeLessThan(lifelines[2]!);

    // Source order across msg, reply and note is the vertical order.
    const ys = [0, 1, 2, 3, 4].map((i) => boxOf(drawn.stroke(i === 3 ? 'note-3' : `msg-${i}`)!).y1);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);

    const get = drawn.stroke('msg-0')!;
    expect([get.points[0], get.points[2]]).toEqual([lifelines[0], lifelines[1]]);
    expect(get.markerEnd).toBe(true);
    expect(get.dash).toBeFalsy();
    const rows = drawn.stroke('msg-2')!;
    expect([rows.points[0], rows.points[2]]).toEqual([lifelines[2], lifelines[1]]);
    expect(rows.dash).toBe(true);
    expectCleanLabels(drawn);
  });

  it('declares an actor at its first use and keeps first-appearance order', async () => {
    const drawn = await draw('sequence', 'msg: a b hi\nactor: c Carol\nmsg: c a yo\nactor: b Bob');
    expect(['actor-label-0', 'actor-label-1', 'actor-label-2'].map(drawn.text)).toEqual(['a', 'Bob', 'Carol']);
    const yo = drawn.stroke('msg-1')!;
    expect(yo.points[0]).toBe(centerX(drawn.stroke('lifeline-2')!.points));
    expect(yo.points[2]).toBe(centerX(drawn.stroke('lifeline-0')!.points));
  });

  it('draws a self-message as a loop that returns to its own lifeline', async () => {
    const drawn = await draw('sequence', 'msg: a b x\nmsg: b b retry\nreply: b a y');
    const loop = drawn.stroke('msg-1')!;
    const x = centerX(drawn.stroke('lifeline-1')!.points);
    expect(loop.kind).toBe('path');
    expect(loop.d).toMatch(new RegExp(`^M ${x} [\\d.]+ H [\\d.]+ V [\\d.]+ H ${x}$`));
    expect(loop.markerEnd).toBe(true);
    expect(drawn.text('msg-label-1')).toBe('retry');
    expectCleanLabels(drawn);
  });

  it('accepts sloppy notation: arrows, colons, quotes, case-insensitive ids, an empty message', async () => {
    const drawn = await draw('sequence-diagram', 'msg: client -> server: "login"\nreply: server client\nactor: SERVER Auth service\nmsg: Client->server ok');
    expect(drawn.scene.labels.filter((label) => label.id.startsWith('actor-label')).map((label) => label.text)).toEqual(['client', 'Auth service']);
    expect(drawn.text('msg-label-0')).toBe('login');
    expect(drawn.text('msg-label-1')).toBeUndefined();
    expect(drawn.text('msg-label-2')).toBe('ok');
    // Quotes inside a message are content.
    expect((await draw('seq', 'msg: U p1 click "Buy"')).text('msg-label-0')).toBe('click "Buy"');
  });

  it('reads list items and a note whose text starts with the actor name', async () => {
    const drawn = await draw('sequence', 'actor: Bob\nmsg:\n  - Alice Bob Hello Bob, how are you?\n  - Bob Alice fine\nnote: Bob Bob thinks');
    expect(drawn.text('msg-label-0')).toBe('Hello Bob, how are you?');
    expect(drawn.text('note-label-2')).toBe('Bob thinks');
  });

  it('wraps long text inside its span, then ends it in an ellipsis; labels never collide', async () => {
    const drawn = await draw('sequence', [
      'actor: b Browser', 'actor: a Authorization Server', 'actor: r Resource Server',
      'msg: b a POST /oauth/token with client credentials and requested scope',
      'reply: a b access token (JWT, expires in 3600 seconds)',
      'msg: b r GET /api/v1/orders?status=open with Authorization: Bearer header',
      'msg: a a verify signature against the rotating key set published by the identity provider every hour',
      'reply: r b 200 OK',
    ].join('\n'));
    expectCleanLabels(drawn);
    expect(drawn.text('actor-label-1')).toBe('Authorization');
    expect(drawn.text('actor-label-1-1')).toBe('Server');
    const wrapped = drawn.scene.labels.filter((label) => label.id.startsWith('msg-label-0'));
    expect(wrapped.length).toBeGreaterThan(1);
    expect(wrapped.map((label) => label.text).join(' ')).toBe('POST /oauth/token with client credentials and requested scope');
    expect(drawn.scene.labels.filter((label) => label.id.startsWith('msg-label-3')).at(-1)!.text).toMatch(/…$/);
    // The lifeline between the ends of a long message pauses behind that message's text.
    const pieces = drawn.scene.strokes.filter((stroke) => /^lifeline-1(-\d+)?$/.test(stroke.id));
    expect(pieces.length).toBeGreaterThan(1);
    const label = drawn.placed.find((item) => item.label.id === 'msg-label-2')!;
    pieces.forEach((piece) => expect(boxesOverlap(label.box, boxOf(piece), 0)).toBe(false));
  });

  it('keeps every drawn thing inside the frame and grows downward with the story', async () => {
    const short = await draw('sequence', 'msg: A B hello');
    const long = await draw('sequence', Array.from({ length: 16 }, (_, i) => `${i % 2 ? 'reply: B A' : 'msg: A B'} step ${i + 1}`).join('\n'));
    expect(long.scene.height).toBeGreaterThan(short.scene.height);
    for (const drawn of [short, long]) {
      for (const stroke of drawn.scene.strokes.filter((item) => item.kind !== 'path')) {
        const box = boxOf(stroke);
        expect(box.x1).toBeGreaterThanOrEqual(0);
        expect(box.y1).toBeGreaterThanOrEqual(0);
        expect(box.x2).toBeLessThanOrEqual(drawn.scene.width);
        expect(box.y2).toBeLessThanOrEqual(drawn.scene.height);
      }
      expectCleanLabels(drawn);
    }
    // A long diagram repeats its actors at the foot; a one-message diagram does not.
    expect(long.stroke('actor-foot-0')).toBeDefined();
    expect(short.stroke('actor-foot-0')).toBeUndefined();
  });

  it('refuses what it cannot draw faithfully, with the reason', async () => {
    expect(await reason('sequence', 'actor: a Alice\nnote: a waits')).toBe('missing msg|reply');
    expect(await reason('sequence', 'msg: a b hi\nnote: validates token')).toMatch(/note names an actor that no actor or message line declares: validates/);
    expect(await reason('sequence', 'msg: lonely')).toMatch(/msg needs a sender and a receiver/);
    const actors = Array.from({ length: SEQUENCE_MAX_ACTORS + 1 }, (_, i) => `msg: n${i} n${i + 1} go`).join('\n');
    expect(await reason('sequence', actors)).toMatch(new RegExp(`at most ${SEQUENCE_MAX_ACTORS} actors`));
    const events = Array.from({ length: SEQUENCE_MAX_EVENTS + 1 }, () => 'msg: a b go').join('\n');
    expect(await reason('sequence', events)).toMatch(new RegExp(`at most ${SEQUENCE_MAX_EVENTS} messages`));
    expect(await reason('sequence', 'msg: a b hi\ncolor: red')).toMatch(/unconsumed declaration: color/);
  });

  it('never throws on hostile input', async () => {
    for (const content of ['msg: <script>alert(1)</script> b "x', `msg: a b ${'w'.repeat(4000)}`, 'msg: a a', 'reply: -> ->', 'msg: 🙂 🙃 ✨']) {
      const drawn = await draw('sequence', content).catch((error: Error) => error.message);
      expect(typeof drawn === 'string' ? drawn : 'drawn').not.toMatch(/undefined|NaN|Cannot read/);
    }
  });
});
