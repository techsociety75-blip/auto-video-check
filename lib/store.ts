import { put, del, get } from '@vercel/blob';
import type { Store } from './types';

const STORE_PATH = 'tiktok-tracker/store.json';

export async function loadStore(): Promise<Store> {
  try {
    const result = await get(STORE_PATH, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { videos: [] };
    }
    const text = await streamToString(result.stream);
    const data = JSON.parse(text) as Store;
    if (!data.videos) return { videos: [] };
    return data;
  } catch {
    return { videos: [] };
  }
}

export async function saveStore(store: Store): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Connect a Vercel Blob store to this project (Storage tab in the Vercel dashboard) and redeploy.'
    );
  }

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
    access: 'private',
    contentType: 'application/json',
  });
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(merged);
}
