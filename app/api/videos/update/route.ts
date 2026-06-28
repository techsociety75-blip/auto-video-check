import { NextRequest, NextResponse } from 'next/server';
import { mutateStore } from '@/lib/store';
import { makeNewVideo } from '@/lib/scheduler';
import type { TrackedVideo } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const id = body?.id;
    const action = body?.action; // 'delete' | 'replace'
    const newUrl = body?.newUrl?.trim();
    const newLabel = body?.newLabel?.trim() || undefined;

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
    }

    if (action === 'replace') {
      if (!newUrl || !/^https?:\/\//i.test(newUrl) || !newUrl.includes('tiktok.com')) {
        return NextResponse.json({ error: 'A valid TikTok URL is required' }, { status: 400 });
      }
    }

    let notFound = false;
    let freshVideo: TrackedVideo | null = null;

    const { result } = await mutateStore((store) => {
      const idx = store.videos.findIndex((v) => v.id === id);
      if (idx === -1) {
        notFound = true;
        return null;
      }

      if (action === 'delete') {
        store.videos.splice(idx, 1);
        return 'deleted';
      }

      if (action === 'replace') {
        // Mark the old one finished (stops its 3hr cadence) and add a
        // fresh 7-day tracker for the new link.
        store.videos[idx] = { ...store.videos[idx], status: 'finished' };
        const fresh = makeNewVideo(newUrl, newLabel ?? store.videos[idx].label);
        store.videos.unshift(fresh);
        freshVideo = fresh;
        return fresh;
      }

      return 'unknown';
    });

    if (notFound) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    if (result === 'unknown') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
    if (action === 'replace') {
      return NextResponse.json({ ok: true, video: freshVideo });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Failed to update video:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
