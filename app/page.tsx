'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { TrackedVideo } from '@/lib/types';
import { VideoCard } from '@/components/VideoCard';
import { AddVideoForm } from '@/components/AddVideoForm';

export default function Home() {
  const [videos, setVideos] = useState<TrackedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/videos', { cache: 'no-store' });
    const data = await res.json();
    setVideos(data.videos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 30000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [refresh]);

  const handleAdd = useCallback(
    async (url: string, label?: string): Promise<string | null> => {
      const res = await fetch('/api/videos/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, label }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.error ?? 'Failed to add video';
      }
      await refresh();
      return null;
    },
    [refresh]
  );

  const handleReplace = useCallback(
    async (id: string, newUrl: string) => {
      await fetch('/api/videos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'replace', newUrl }),
      });
      await refresh();
    },
    [refresh]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch('/api/videos/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      });
      await refresh();
    },
    [refresh]
  );

  const handleManualCheck = useCallback(async () => {
    setChecking(true);
    await fetch('/api/check');
    await refresh();
    setChecking(false);
  }, [refresh]);

  const active = useMemo(
    () => videos.filter((v) => v.status !== 'finished'),
    [videos]
  );
  const finished = useMemo(
    () => videos.filter((v) => v.status === 'finished'),
    [videos]
  );

  const counts = useMemo(
    () => ({
      live: videos.filter((v) => v.status === 'live').length,
      removed: videos.filter((v) => v.status === 'removed').length,
      pending: videos.filter((v) => v.status === 'pending' || v.status === 'error').length,
    }),
    [videos]
  );

  return (
    <main className="min-h-screen bg-bg px-6 py-10 max-w-3xl mx-auto">
      <header className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Watchtower</h1>
          <p className="text-sm text-muted font-mono mt-1">
            TikTok link monitor — 7-day window, 3-hour follow-up on removal
          </p>
        </div>
        <button
          onClick={handleManualCheck}
          disabled={checking}
          className="text-xs font-mono px-3 py-2 rounded-md border border-border text-muted hover:text-[#e6e9ed] hover:border-live/50 transition disabled:opacity-50 whitespace-nowrap"
        >
          {checking ? 'Checking…' : 'Check all now'}
        </button>
      </header>

      <div className="flex gap-4 mb-6 text-xs font-mono">
        <span className="text-live">{counts.live} live</span>
        <span className="text-removed">{counts.removed} removed</span>
        <span className="text-pending">{counts.pending} pending</span>
      </div>

      <div className="mb-8">
        <AddVideoForm onAdd={handleAdd} />
      </div>

      {loading ? (
        <p className="text-sm text-muted font-mono">Loading…</p>
      ) : active.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted font-mono">No videos tracked yet. Add a link above to start.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {active.map((v) => (
            <VideoCard key={v.id} video={v} now={now} onReplace={handleReplace} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {finished.length > 0 && (
        <details className="mt-8">
          <summary className="text-xs font-mono text-muted cursor-pointer">
            {finished.length} completed / replaced video{finished.length > 1 ? 's' : ''}
          </summary>
          <div className="flex flex-col gap-3 mt-4">
            {finished.map((v) => (
              <div key={v.id} className="text-xs font-mono text-muted border border-border rounded-md p-3 truncate">
                {v.url}
              </div>
            ))}
          </div>
        </details>
      )}
    </main>
  );
}
