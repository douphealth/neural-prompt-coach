// Signed Premium license tokens: base64url(payload) + "." + base64url(HMAC-SHA256(payload)).
// The token proves the server verified a paid Stripe Checkout Session. It holds no email.

export interface LicensePayload {
  v: 1;
  /** Stripe Checkout Session id that was verified as paid. */
  sid: string;
  /** Issued-at, seconds since epoch. */
  iat: number;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signLicense(secret: string, sid: string, now = Date.now()): Promise<string> {
  const payload: LicensePayload = { v: 1, sid, iat: Math.floor(now / 1000) };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

export async function verifyLicense(secret: string, token: unknown): Promise<LicensePayload | null> {
  if (typeof token !== 'string' || token.length > 1024) return null;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra !== undefined) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as LicensePayload;
    if (payload?.v !== 1 || typeof payload.sid !== 'string' || typeof payload.iat !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
}
