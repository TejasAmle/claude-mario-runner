import { describe, it, expect } from 'vitest';
import { checkHandle, HANDLE_RE } from '../src/net/validate.js';

describe('HANDLE_RE', () => {
  it.each([
    ['ab', true],
    ['a1', true],
    ['a-b', true],
    ['tejas', true],
    ['a1-b2-c3', true],
    ['claude-1337', true],
    ['abcdefghijklmnopqrstuvwx', true], // 24 chars
  ])('accepts %s', (s, ok) => {
    expect(HANDLE_RE.test(s)).toBe(ok);
  });

  it.each([
    ['a'],               // too short
    ['-ab'],             // starts with dash
    ['A'],               // uppercase
    ['abc_def'],         // underscore
    ['abc def'],         // space
    ['abcdefghijklmnopqrstuvwxy'], // 25 chars
    [''],
  ])('rejects %s', (s) => {
    expect(HANDLE_RE.test(s)).toBe(false);
  });
});

describe('checkHandle', () => {
  it('passes good handles', () => {
    expect(checkHandle('tejas')).toEqual({ ok: true });
  });
  it('flags empty as empty', () => {
    expect(checkHandle('  ')).toEqual({ ok: false, reason: 'empty' });
  });
  it('flags shape violations', () => {
    expect(checkHandle('A')).toEqual({ ok: false, reason: 'shape' });
  });
  it('flags reserved handles', () => {
    expect(checkHandle('admin')).toEqual({ ok: false, reason: 'reserved' });
    expect(checkHandle('ANTHROPIC')).toEqual({ ok: false, reason: 'reserved' });
  });
  it('trims and lowercases before checking', () => {
    expect(checkHandle('  Tejas  ')).toEqual({ ok: true });
  });
});
