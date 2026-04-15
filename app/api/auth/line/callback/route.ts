import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

// 驗證 bind state 的 HMAC 簽名
// 有效期 10 分鐘；使用 timingSafeEqual 防止 timing attack
// 回傳驗證通過的 uid，或 null（驗證失敗）
function verifyBindState(state: string, secret: string): string | null {
    const parts = state.split(':');
    if (parts.length !== 4 || parts[0] !== 'bind') return null;

    const [, uid, ts, sig] = parts;
    const timestamp = Number(ts);
    if (isNaN(timestamp) || Date.now() - timestamp > 10 * 60 * 1000) return null;

    const expected = createHmac('sha256', secret)
        .update(`${uid}:${ts}`)
        .digest('hex')
        .slice(0, 16);

    try {
        const sigBuf = Buffer.from(sig, 'hex');
        const expBuf = Buffer.from(expected, 'hex');
        if (sigBuf.length !== expBuf.length) return null;
        if (!timingSafeEqual(sigBuf, expBuf)) return null;
    } catch {
        return null;
    }

    return uid || null;
}

// Handles LINE Login OAuth callback
// GET /api/auth/line/callback?code=XXX&state=YYY
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || 'login';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!code) {
        return NextResponse.redirect(`${appUrl}/?line_error=cancelled`);
    }

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!channelId || !channelSecret) {
        return NextResponse.redirect(`${appUrl}/?line_error=config`);
    }

    const redirectUri = `${appUrl}/api/auth/line/callback`;

    try {
        // Step 1: Exchange code for access token
        const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: redirectUri,
                client_id: channelId,
                client_secret: channelSecret,
            }),
        });

        if (!tokenRes.ok) {
            return NextResponse.redirect(`${appUrl}/?line_error=token`);
        }

        const tokenData = await tokenRes.json();
        const accessToken: string = tokenData.access_token;

        // Step 2: Get LINE user profile
        const profileRes = await fetch('https://api.line.me/v2/profile', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!profileRes.ok) {
            return NextResponse.redirect(`${appUrl}/?line_error=profile`);
        }

        const profile = await profileRes.json();
        const lineUserId: string = profile.userId;

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Step 3: Handle state
        if (state.startsWith('bind:')) {
            // Binding flow: link LINE account to existing game account
            // 驗證 HMAC 簽名，防止攻擊者偽造 state 綁定他人帳號
            const uid = verifyBindState(state, channelSecret!);
            if (!uid) {
                return NextResponse.redirect(`${appUrl}/?line_error=invalid_state`);
            }

            // Check if this LINE account is already bound to another user
            const { data: existing } = await supabase
                .from('CharacterStats')
                .select('UserID')
                .eq('LineUserId', lineUserId)
                .maybeSingle();

            if (existing && existing.UserID !== uid) {
                return NextResponse.redirect(`${appUrl}/?line_error=already_bound`);
            }

            const { error } = await supabase
                .from('CharacterStats')
                .update({ LineUserId: lineUserId })
                .eq('UserID', uid);

            if (error) {
                return NextResponse.redirect(`${appUrl}/?line_error=bind_failed`);
            }

            return NextResponse.redirect(`${appUrl}/?line_bound=success`);
        } else {
            // Login flow: find user by LINE ID
            const { data: user } = await supabase
                .from('CharacterStats')
                .select('UserID')
                .eq('LineUserId', lineUserId)
                .maybeSingle();

            if (!user) {
                return NextResponse.redirect(`${appUrl}/?line_error=not_bound`);
            }

            // Encode UserID in URL (safe: it's a phone number)
            const encoded = encodeURIComponent(user.UserID);
            return NextResponse.redirect(`${appUrl}/?line_uid=${encoded}`);
        }
    } catch {
        return NextResponse.redirect(`${appUrl}/?line_error=server`);
    }
}
