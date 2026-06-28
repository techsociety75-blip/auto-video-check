import { NextRequest, NextResponse } from 'next/server';
import { loadStoreForMutation, saveStore, BlobPreconditionFailedError } from '@/lib/store';
import { checkTikTokVideo } from '@/lib/tiktok-checker';
import { isDue, applyCheckResult } from '@/lib/scheduler';
import { sendTelegramMessage } from '@/lib/telegram';

export const maxDuration = 60;

const MAX_RETRIES = 3;

export async function GET(req: NextRequest) {
  // Verify this is actually called by Vercel Cron (or has the secret), to
  // prevent randoms from triggering checks via a public URL.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const results: Array<{ id: string; url: string; status: string }> = [];

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { store, etag } = await loadStoreForMutation();
      results.length = 0; // reset in case this is a retry

      for (let i = 0; i < store.videos.length; i++) {
        const video = store.videos[i];

        // Close out videos whose 7-day window has ended without removal.
        if (
          video.status !== 'removed' &&
          video.status !== 'finished' &&
          now.getTime() > new Date(video.trackingEndsAt).getTime()
        ) {
          store.videos[i] = { ...video, status: 'finished' };
          continue;
        }

        if (!isDue(video, now)) continue;

        const result = await checkTikTokVideo(video.url);
        const updated = applyCheckResult(video, result, now);
        store.videos[i] = updated;
        results.push({ id: updated.id, url: updated.url, status: updated.status });

        // Fire Telegram notification exactly once per removal event.
        if (updated.status === 'removed' && updated.notified === false) {
          const label = updated.label ? `${updated.label}\n` : '';
          const message =
            `🚨 <b>TikTok video removed</b>\n` +
            `${label}${updated.url}\n\n` +
            `Detected: ${now.toUTCString()}\n` +
            `Will keep re-checking every 3 hours until a new link is added.`;
          const sent = await sendTelegramMessage(message);
          if (sent) {
            store.videos[i] = { ...updated, notified: true };
          }
        }
      }

      try {
        await saveStore(store, etag);
        return NextResponse.json({
          checkedAt: now.toISOString(),
          checked: results.length,
          results,
        });
      } catch (err) {
        if (err instanceof BlobPreconditionFailedError) {
          // Someone else (e.g. an add/delete request) wrote in between -
          // reload and redo the whole check pass against fresh data.
          continue;
        }
        throw err;
      }
    }

    throw new Error('Failed to save cron results after multiple retries due to concurrent updates.');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Cron check failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
