import { NextRequest, NextResponse } from 'next/server';
import { loadStore, saveStore } from '@/lib/store';
import { makeNewVideo } from '@/lib/scheduler';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const url = body?.url?.trim();
  const label = body?.label?.trim() || undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'A valid URL is required' }, { status: 400 });
  }
  if (!url.includes('tiktok.com')) {
    return NextResponse.json(
      { error: 'URL does not look like a TikTok link' },
      { status: 400 }
    );
  }

  const store = await loadStore();

  if (store.videos.some((v) => v.url === url && v.status !== 'finished')) {
    return NextResponse.json(
      { error: 'This URL is already being tracked' },
      { status: 409 }
    );
  }

  const video = makeNewVideo(url, label);
  store.videos.unshift(video);
  await saveStore(store);

  return NextResponse.json({ video }, { status: 201 });
}
