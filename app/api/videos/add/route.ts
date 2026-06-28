import { NextRequest, NextResponse } from 'next/server';
import { mutateStore } from '@/lib/store';
import { makeNewVideo } from '@/lib/scheduler';
import type { TrackedVideo } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
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

    let duplicateError = false;
    let addedVideo: TrackedVideo | null = null;

    const { result, saveResult } = await mutateStore((store) => {
      if (store.videos.some((v) => v.url === url && v.status !== 'finished')) {
        duplicateError = true;
        return null;
      }
      const video = makeNewVideo(url, label);
      store.videos.unshift(video);
      addedVideo = video;
      return video;
    });

    if (duplicateError) {
      return NextResponse.json(
        { error: 'This URL is already being tracked' },
        { status: 409 }
      );
    }

    return NextResponse.json({ video: result ?? addedVideo, saveResult }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    console.error('Failed to add video:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
