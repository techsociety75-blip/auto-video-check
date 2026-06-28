import { NextRequest, NextResponse } from 'next/server';
import { loadStore, saveStore } from '@/lib/store';
import { makeNewVideo } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const id = body?.id;
  const action = body?.action; // 'delete' | 'replace'
  const newUrl = body?.newUrl?.trim();
  const newLabel = body?.newLabel?.trim() || undefined;

  if (!id || !action) {
    return NextResponse.json({ error: 'id and action are required' }, { status: 400 });
  }

  const store = await loadStore();
  const idx = store.videos.findIndex((v) => v.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  if (action === 'delete') {
    store.videos.splice(idx, 1);
    await saveStore(store);
    return NextResponse.json({ ok: true });
  }

  if (action === 'replace') {
    if (!newUrl || !/^https?:\/\//i.test(newUrl) || !newUrl.includes('tiktok.com')) {
      return NextResponse.json({ error: 'A valid TikTok URL is required' }, { status: 400 });
    }
    // Mark the old one finished (stops its 3hr cadence) and add a fresh
    // 7-day tracker for the new link.
    store.videos[idx] = { ...store.videos[idx], status: 'finished' };
    const fresh = makeNewVideo(newUrl, newLabel ?? store.videos[idx].label);
    store.videos.unshift(fresh);
    await saveStore(store);
    return NextResponse.json({ ok: true, video: fresh });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
