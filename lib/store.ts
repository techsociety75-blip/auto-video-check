import { put, get } from '@vercel/blob';
import type { Store } from './types';

const STORE_PATH = 'tiktok-tracker/store.json';

export async function loadStore(): Promise<Store> {
  try {
    // cacheControlMaxAge: 0 on put() (set below) keeps this fresh; we also
    // avoid any caching here by always hitting the Blob API directly rather
    // than fetching a cached public URL.
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
  const hasStaticToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasOidcAuth = !!process.env.BLOB_STORE_ID; // VERCEL_OIDC_TOKEN is set automatically by Vercel at runtime

  if (!hasStaticToken && !hasOidcAuth) {
    throw new Error(
      'No Blob store credentials found (checked BLOB_READ_WRITE_TOKEN and BLOB_STORE_ID). Connect a Vercel Blob store to this project (Storage tab in the Vercel dashboard) and redeploy.'
    );
  }

  // Write directly with allowOverwrite - no delete-then-put race. A
  // delete immediately followed by a put can cause the very next read to
  // hit a stale "not found" cache entry from the delete, which is why
  // newly added videos were disappearing immediately after being saved.
  await put(STORE_PATH, JSON.stringify(store, null, 2), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    cacheControlMaxAge: 0,
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
