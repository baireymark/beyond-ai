// Per-client enquiry limit. State is module-wide, so every test uses its own client keys.
import { describe, expect, it } from 'vitest';
import { allowRequest } from './rate-limit';

const WINDOW = 10 * 60_000;

describe('allowRequest', () => {
  it('allows 5 enquiries per client, then blocks the next', () => {
    const t = 1_000_000;
    expect(Array.from({ length: 6 }, (_, i) => allowRequest('203.0.113.1', t + i))).toEqual([true, true, true, true, true, false]);
  });

  it('allows the client again once the oldest enquiry leaves the 10-minute window', () => {
    const t = 2_000_000;
    for (let i = 0; i < 5; i++) allowRequest('203.0.113.2', t);
    expect(allowRequest('203.0.113.2', t + WINDOW - 1)).toBe(false);
    expect(allowRequest('203.0.113.2', t + WINDOW)).toBe(true);
  });

  it('does not count blocked attempts against the client', () => {
    const t = 3_000_000;
    for (let i = 0; i < 5; i++) allowRequest('203.0.113.3', t);
    for (let i = 1; i <= 100; i++) allowRequest('203.0.113.3', t + i);
    expect(allowRequest('203.0.113.3', t + WINDOW)).toBe(true);
  });

  it('counts each client separately', () => {
    const t = 4_000_000;
    for (let i = 0; i < 5; i++) allowRequest('203.0.113.4', t);
    expect(allowRequest('203.0.113.4', t)).toBe(false);
    expect(allowRequest('203.0.113.5', t)).toBe(true);
  });

  it('keeps limiting active clients when idle clients are pruned', () => {
    const t = 5_000_000;
    for (let i = 0; i < 5001; i++) allowRequest(`idle-${i}`, t); // more than 5000 clients tracked
    // These calls see the idle clients' only enquiry fall out of the window, so each one prunes them.
    for (let i = 0; i < 5; i++) allowRequest('203.0.113.6', t + WINDOW);
    expect(allowRequest('203.0.113.6', t + WINDOW + 1)).toBe(false);
  });
});
