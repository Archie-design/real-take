import { createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days
const SIG_LEN = 32; // hex chars of truncated HMAC

// Session token format: `<uid>:<issuedAtMs>:<sig>`，sig = HMAC-SHA256(uid:issuedAt, secret) 前 32 hex
export function signSession(uid: string, secret: string): string {
    const ts = Date.now();
    const sig = createHmac('sha256', secret).update(`${uid}:${ts}`).digest('hex').slice(0, SIG_LEN);
    return `${uid}:${ts}:${sig}`;
}

export function verifySession(token: string | undefined | null, secret: string, ttlMs = DEFAULT_TTL_MS): string | null {
    if (!token || !secret) return null;
    const parts = token.split(':');
    if (parts.length !== 3) return null;
    const [uid, ts, sig] = parts;
    const issued = Number(ts);
    if (!uid || !Number.isFinite(issued)) return null;
    if (Date.now() - issued > ttlMs) return null;

    const expected = createHmac('sha256', secret).update(`${uid}:${ts}`).digest('hex').slice(0, SIG_LEN);
    try {
        const a = Buffer.from(sig, 'hex');
        const b = Buffer.from(expected, 'hex');
        if (a.length !== b.length) return null;
        if (!timingSafeEqual(a, b)) return null;
    } catch {
        return null;
    }
    return uid;
}

export const SESSION_COOKIE_NAME = 'rt_sess';
export const SESSION_MAX_AGE_S = 30 * 24 * 3600;
