import { NextResponse } from 'next/server';
import { runAngelCallPairing } from '@/app/actions/admin';

// Called by Vercel Cron every Monday at 04:00 UTC (= 12:00 Taiwan time)
// vercel.json: { "crons": [{ "path": "/api/cron/auto-draw", "schedule": "0 4 * * 1" }] }
export async function GET(request: Request) {
    // Verify this is a legitimate cron call (Vercel sets CRON_SECRET automatically)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[cron/auto-draw] CRON_SECRET env var is not set. Cron will always fail until this is configured in Vercel environment variables.');
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[cron/auto-draw] Authorization header mismatch. Got:', authHeader);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[cron/auto-draw] Starting angel call pairing at', new Date().toISOString());
    const result = await runAngelCallPairing();
    console.log('[cron/auto-draw] Completed:', JSON.stringify(result));
    return NextResponse.json(result);
}
