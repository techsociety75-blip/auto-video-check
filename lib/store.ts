import { put, head, del } from '@vercel/blob';
import type { Store } from './types';

const STORE_PATH = 'tiktok-tracker/store.json';

async function fetchBlobUrl(): Promise<string | null> {
  try {
    const info = await head(STORE_PATH);
    return info?.url ?? null;
  } catch {
    return null;
  }
}

export async function loadStore(): Promise<Store> {
  const url = await fetchBlobUrl();
  if (!url) {
    return { videos: [] };
  }
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return { videos: [] };
    const data = (await res.json()) as Store;
    if (!data.videos) return { videos: [] };
    return data;
  } catch {
    return { videos: [] };
  }
}

export async function saveStore(store: Store): Promise<void> {
  // Delete any existing blob at this path first, then write fresh. This
  // avoids depending on the `allowOverwrite` option, which is only present
  // in newer @vercel/blob SDK versions - deleting first works the same way
  // regardless of installed SDK version.
  try {
    await del(STORE_PATH);
  } catch {
    // No existing blob to delete, or delete failed - proceed to write anyway.
  }

  await put(STORE_PATH, JSON.stringify(store, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}
