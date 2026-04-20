import { describe, it, expect } from 'vitest';
import { parseKeyBytes } from '../src/engine/input.js';

describe('parseKeyBytes', () => {
  it('decodes plain letters', () => {
    const evs = parseKeyBytes('abc');
    expect(evs.map((e) => e.key)).toEqual(['a', 'b', 'c']);
    expect(evs.every((e) => !e.ctrl && !e.alt && !e.shift)).toBe(true);
  });

  it('decodes Shift+letter as lowercase with shift flag', () => {
    const [e] = parseKeyBytes('Q');
    expect(e?.key).toBe('q');
    expect(e?.shift).toBe(true);
  });

  it('decodes space as Space', () => {
    expect(parseKeyBytes(' ')[0]?.key).toBe('Space');
  });

  it('decodes enter/return as Enter', () => {
    expect(parseKeyBytes('\r')[0]?.key).toBe('Enter');
    expect(parseKeyBytes('\n')[0]?.key).toBe('Enter');
  });

  it('decodes lone ESC as Escape', () => {
    const [e] = parseKeyBytes('\x1b');
    expect(e?.key).toBe('Escape');
  });

  it('decodes arrow keys (CSI)', () => {
    expect(parseKeyBytes('\x1b[A')[0]?.key).toBe('ArrowUp');
    expect(parseKeyBytes('\x1b[B')[0]?.key).toBe('ArrowDown');
    expect(parseKeyBytes('\x1b[C')[0]?.key).toBe('ArrowRight');
    expect(parseKeyBytes('\x1b[D')[0]?.key).toBe('ArrowLeft');
  });

  it('decodes arrow keys (SS3 / application mode)', () => {
    expect(parseKeyBytes('\x1bOA')[0]?.key).toBe('ArrowUp');
    expect(parseKeyBytes('\x1bOD')[0]?.key).toBe('ArrowLeft');
  });

  it('decodes Ctrl+letter', () => {
    const [e] = parseKeyBytes('\x03');
    expect(e?.key).toBe('c');
    expect(e?.ctrl).toBe(true);
  });

  it('decodes Alt+letter as alt flag on the letter', () => {
    const [e] = parseKeyBytes('\x1ba');
    expect(e?.key).toBe('a');
    expect(e?.alt).toBe(true);
  });

  it('decodes a mixed burst in order', () => {
    const evs = parseKeyBytes('a\x1b[Cb\x1b[D ');
    expect(evs.map((e) => e.key)).toEqual(['a', 'ArrowRight', 'b', 'ArrowLeft', 'Space']);
  });

  it('decodes Backspace (both 0x7f and 0x08)', () => {
    expect(parseKeyBytes('\x7f')[0]?.key).toBe('Backspace');
    expect(parseKeyBytes('\x08')[0]?.key).toBe('Backspace');
  });

  it('decodes Tab', () => {
    expect(parseKeyBytes('\t')[0]?.key).toBe('Tab');
  });

  it('decodes Delete (CSI 3~)', () => {
    expect(parseKeyBytes('\x1b[3~')[0]?.key).toBe('Delete');
  });
});
