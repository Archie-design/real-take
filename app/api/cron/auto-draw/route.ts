import { NextResponse } from 'next/server';
import { autoDrawAllSquads } from '@/app/actions/team';

// Called by Vercel Cron every Monday at 04:00 UTC (= 12:00 Taiwan time)
// vercel.json: { "crons": [{ "path": "/api/cron/auto-draw", "schedule": "0 4 * * 1" }] }
export async function GET(request: Request) {
    // Verify this is a legitimate cron call (Vercel sets this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await autoDrawAllSquads();
    return NextResponse.json(result);
}
