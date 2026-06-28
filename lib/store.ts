import { put, get, BlobPreconditionFailedError } from '@vercel/blob';
import type { Store } from './types';

const STORE_PATH = 'tiktok-tracker/store.json';
const MAX_RETRIES = 5;

export interface LoadedStore {
  store: Store;
  etag: string | null;
}

export interface SaveResult {
  url: string;
  etag: string;
  uploadedSize: number;
}

function checkCredentials() {
  const hasStaticToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const hasOidcAuth = !!process.env.BLOB_STORE_ID; // VERCEL_OIDC_TOKEN is set automatically by Vercel at runtime
  if (!hasStaticToken && !hasOidcAuth) {
    throw new Error(
      'No Blob store credentials found (checked BLOB_READ_WRITE_TOKEN and BLOB_STORE_ID). Connect a Vercel Blob store to this project (Storage tab in the Vercel dashboard) and redeploy.'
    );
  }
}

async function loadStoreWithEtag(): Promise<LoadedStore> {
  try {
    const result = await get(STORE_PATH, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { store: { videos: [] }, etag: null };
    }
    const text = await streamToString(result.stream);
    const data = JSON.parse(text) as Store;
    if (!data.videos) return { store: { videos: [] }, etag: result.blob.etag };
    return { store: data, etag: result.blob.etag };
  } catch {
    return { store: { videos: [] }, etag: null };
  }
}

/** Simple read with no concurrency tracking - fine for read-only display. */
export async function loadStore(): Promise<Store> {
  const { store } = await loadStoreWithEtag();
  return store;
}

/** Read that also returns the ETag, for callers doing their own conditional save. */
export async function loadStoreForMutation(): Promise<LoadedStore> {
  return loadStoreWithEtag();
}

/**
 * Writes the store. If `expectedEtag` is provided, the write only succeeds
 * if the blob hasn't changed since that ETag was read - throws
 * BlobPreconditionFailedError otherwise, so the caller can reload and retry.
 * Pass `null` to write unconditionally (e.g. for a brand new store).
 */
export async function saveStore(store: Store, expectedEtag: string | null = null): Promise<SaveResult> {
  checkCredentials();
  const payload = JSON.stringify(store, null, 2);
  const result = await put(STORE_PATH, payload, {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    ...(expectedEtag ? { ifMatch: expectedEtag } : {}),
  });
  return { url: result.url, etag: result.etag, uploadedSize: payload.length };
}

/**
 * Atomically reads the store, applies a synchronous `mutator` to it, and
 * writes the result back - retrying automatically if another request
 * modified the store in between (using the blob's ETag for optimistic
 * concurrency).
 *
 * This fixes a lost-update race: without this, two requests that both
 * read the store before either had saved would each save their own
 * change based on a stale copy, and the second save would silently wipe
 * out the first request's change. This is exactly what happened when
 * multiple videos were added in quick succession and only the last one
 * survived.
 *
 * Use this for simple, synchronous mutations (add/delete/replace one
 * video). For mutations that need to do async work per-item (like
 * checking each video's live status over the network), use
 * `loadStoreForMutation` + `saveStore(store, etag)` directly with your own
 * retry loop instead, since the mutator here must be synchronous.
 */
export async function mutateStore<T>(
  mutator: (store: Store) => T
): Promise<{ result: T; saveResult: SaveResult }> {
  checkCredentials();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { store, etag } = await loadStoreWithEtag();
    const result = mutator(store);

    try {
      const saveResult = await saveStore(store, etag);
      return { result, saveResult };
    } catch (err) {
      if (err instanceof BlobPreconditionFailedError) {
        // Someone else wrote in between - reload and retry the mutation
        // from scratch on the next loop iteration.
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to save after multiple retries due to concurrent updates. Please try again.');
}

export { BlobPreconditionFailedError };

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
