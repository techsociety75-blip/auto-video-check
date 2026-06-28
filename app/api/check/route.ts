import { NextRequest, NextResponse } from 'next/server';
import { loadStore, saveStore } from '@/lib/store';
import { checkTikTokVideo } from '@/lib/tiktok-checker';
import { isDue, applyCheckResult } from '@/lib/scheduler';
import { sendTelegramMessage } from '@/lib/telegram';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify this is actually called by Vercel Cron (or has the secret), to
  // prevent randoms from triggering checks via a public URL.
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const store = await loadStore();
  const now = new Date();
  const results: Array<{ id: string; url: string; status: string }> = [];

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

  await saveStore(store);

  return NextResponse.json({
    checkedAt: now.toISOString(),
    checked: results.length,
    results,
  });
}
