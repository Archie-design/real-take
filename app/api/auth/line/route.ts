import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// 產生帶 HMAC 簽名的 bind state，防止 CSRF 帳號劫持
// 格式：bind:{uid}:{timestamp}:{sig16}
function signBindState(uid: string, secret: string): string {
    const ts = Date.now().toString();
    const sig = createHmac('sha256', secret)
        .update(`${uid}:${ts}`)
        .digest('hex')
        .slice(0, 16);
    return `bind:${uid}:${ts}:${sig}`;
}

// 產生帶 HMAC 簽名的 login state，防止固定字串被 replay
// 格式：login:{timestamp}:{sig16}
function signLoginState(secret: string): string {
    const ts = Date.now().toString();
    const sig = createHmac('sha256', secret)
        .update(`login:${ts}`)
        .digest('hex')
        .slice(0, 16);
    return `login:${ts}:${sig}`;
}

// Initiates LINE Login OAuth flow
// GET /api/auth/line?action=login
// GET /api/auth/line?action=bind&uid=USER_ID
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'login';
    const uid = searchParams.get('uid') || '';

    const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!channelId || !channelSecret) {
        return NextResponse.json({ error: 'LINE Login not configured' }, { status: 500 });
    }

    const redirectUri = `${appUrl}/api/auth/line/callback`;

    // bind / login state 都加入 HMAC 簽名，避免 replay
    const state = action === 'bind' && uid
        ? signBindState(uid, channelSecret)
        : signLoginState(channelSecret);

    const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
    lineAuthUrl.searchParams.set('response_type', 'code');
    lineAuthUrl.searchParams.set('client_id', channelId);
    lineAuthUrl.searchParams.set('redirect_uri', redirectUri);
    lineAuthUrl.searchParams.set('scope', 'profile');
    lineAuthUrl.searchParams.set('state', state);

    return NextResponse.redirect(lineAuthUrl.toString());
}
