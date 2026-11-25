import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load() {
  vi.resetModules();
  return import('@/lib/premium');
}

function mockApi(handler: (path: string, body: Record<string, unknown>) => { status?: number; body: unknown; html?: boolean }) {
  const fn = vi.fn(async (path: string, init?: RequestInit) => {
    const r = handler(path, JSON.parse(String(init?.body || '{}')));
    return new Response(r.html ? '<!doctype html>' : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: { 'content-type': r.html ? 'text/html' : 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('premium entitlement', () => {
  it('is free by default and the old URL trick no longer unlocks', async () => {
    const p = await load();
    expect(p.getState().status).toBe('free');
  });

  it('never unlocks when verification fails or the API is missing', async () => {
    mockApi(() => ({ html: true, body: null }));
    const p = await load();
    const r = await p.verifyCheckoutSession('cs_test_abcdefghijklmnop');
    expect(r).toEqual({ ok: false, error: 'not_configured' });
    expect(p.getState().status).toBe('free');
    expect(localStorage.getItem('promptgrade_license')).toBeNull();
  });

  it('unlocks only with a server-issued license', async () => {
    mockApi(() => ({ body: { ok: true, license: 'signed.token', order: { reference: 'pi_x' } } }));
    const p = await load();
    const r = await p.verifyCheckoutSession('cs_test_abcdefghijklmnop');
    expect(r.ok).toBe(true);
    expect(p.getState().status).toBe('premium');
    expect(localStorage.getItem('promptgrade_license')).toBe('signed.token');
  });

  it('keeps existing (legacy) buyers unlocked during the grace period', async () => {
    localStorage.setItem('promptgrade_premium', 'true');
    const p = await load();
    expect(p.getState().status).toBe('legacy_grace');
  });

  it('migrates a legacy buyer with a stored session id to a license', async () => {
    localStorage.setItem('promptgrade_premium', 'true');
    localStorage.setItem('promptgrade_session_id', 'cs_live_abcdefghijklmnop');
    const api = mockApi((path) => {
      expect(path).toBe('/api/verify-session');
      return { body: { ok: true, license: 'signed.token', order: { reference: 'pi_x' } } };
    });
    const p = await load();
    await p.syncEntitlement();
    expect(api).toHaveBeenCalledTimes(1);
    expect(p.getState().status).toBe('premium');
    expect(localStorage.getItem('promptgrade_premium')).toBeNull();
  });

  it('keeps a legacy buyer unlocked when the API is unavailable', async () => {
    localStorage.setItem('promptgrade_premium', 'true');
    localStorage.setItem('promptgrade_session_id', 'cs_live_abcdefghijklmnop');
    mockApi(() => ({ status: 503, body: { ok: false, error: 'not_configured' } }));
    const p = await load();
    await p.syncEntitlement();
    expect(p.getState().status).toBe('legacy_grace');
  });

  it('ends a legacy unlock that Stripe says was never paid', async () => {
    localStorage.setItem('promptgrade_premium', 'true');
    localStorage.setItem('promptgrade_session_id', 'cs_live_abcdefghijklmnop');
    mockApi(() => ({ body: { ok: false, error: 'not_paid' } }));
    const p = await load();
    await p.syncEntitlement();
    expect(p.getState().status).toBe('free');
  });

  it('drops a license the server says is no longer valid (refund)', async () => {
    localStorage.setItem('promptgrade_license', 'signed.token');
    mockApi(() => ({ body: { ok: true, valid: false, reason: 'refunded' } }));
    const p = await load();
    expect(p.getState().status).toBe('premium');
    await p.syncEntitlement();
    expect(p.getState().status).toBe('free');
  });

  it('keeps a license when the license check cannot be reached', async () => {
    localStorage.setItem('promptgrade_license', 'signed.token');
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))));
    const p = await load();
    await p.syncEntitlement();
    expect(p.getState().status).toBe('premium');
  });
});

describe('free daily limit', () => {
  it('counts per calendar day and resets the next day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 25, 10, 0));
    const p = await load();
    for (let i = 0; i < 5; i++) p.recordUsage();
    expect(p.getUsageToday()).toBe(5);
    vi.setSystemTime(new Date(2026, 10, 26, 9, 0));
    expect(p.getUsageToday()).toBe(0);
  });

  it('removes the old never-resetting counter', async () => {
    localStorage.setItem('promptgrade_count', '99');
    const p = await load();
    expect(p.getUsageToday()).toBe(0);
    expect(localStorage.getItem('promptgrade_count')).toBeNull();
  });
});
