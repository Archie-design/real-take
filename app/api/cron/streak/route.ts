import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recomputeAllAchievements } from '@/app/actions/achievements';

// Vercel Cron：每日 20:00 UTC = 台灣 04:00，重算所有使用者的 Streak 並觸發成就評估。
// vercel.json 已加上 { "path": "/api/cron/streak", "schedule": "0 20 * * *" }
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startedAt = new Date().toISOString();
    console.log('[cron/streak] Starting at', startedAt);

    // 1. 重算 Streak
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const streakRes = await supabase.rpc('compute_streaks');
    if (streakRes.error) {
        console.error('[cron/streak] compute_streaks failed:', streakRes.error);
        return NextResponse.json({ success: false, stage: 'compute_streaks', error: streakRes.error.message }, { status: 500 });
    }

    // 2. 重算全員成就（冪等；PK 會擋重複解鎖）
    const evalRes = await recomputeAllAchievements('cron');

    const result = {
        success: true,
        startedAt,
        finishedAt: new Date().toISOString(),
        streaksUpdated: streakRes.data ?? null,
        processed: evalRes.processed,
        newlyUnlocked: evalRes.newlyUnlocked,
    };
    console.log('[cron/streak] Done:', JSON.stringify(result));
    return NextResponse.json(result);
}
