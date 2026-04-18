import { validateSignature } from '@line/bot-sdk';
import { getLineClient } from '@/lib/line/client';
import { matchKeyword } from '@/lib/line/keywords';

export const runtime = 'nodejs';
export const maxDuration = 30; // seconds

export async function POST(req: Request) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-line-signature') ?? '';
    const channelSecret = process.env.LINE_CHANNEL_SECRET ?? '';

    if (!channelSecret || !validateSignature(rawBody, channelSecret, signature)) {
        return new Response('Unauthorized', { status: 401 });
    }

    let body: { events: any[] };
    try {
        body = JSON.parse(rawBody);
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    const client = getLineClient();

    await Promise.allSettled(
        (body.events ?? []).map(async (event) => {
            try {
                if (event.type !== 'message' || event.message?.type !== 'text') return;

                const text: string = event.message.text;
                const replyToken: string = event.replyToken;

                const response = matchKeyword(text);
                if (response) {
                    await client.replyMessage({ replyToken, messages: [response] });
                }
            } catch (err) {
                console.error('LINE webhook event error:', err);
            }
        }),
    );

    return new Response('OK', { status: 200 });
}
