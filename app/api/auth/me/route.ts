import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth/session';

export const runtime = 'nodejs';

// GET /api/auth/me → 回傳目前 session 綁定的 UserID（或 null）
export async function GET(req: NextRequest) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const secret = process.env.LINE_LOGIN_CHANNEL_SECRET || '';
    const uid = verifySession(token, secret);
    return NextResponse.json({ uid });
}

// DELETE /api/auth/me → 清除 session cookie（logout）
export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return res;
}
