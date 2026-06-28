'use client';

import { useState } from 'react';
import type { TrackedVideo } from '@/lib/types';
import { CountdownRing } from './CountdownRing';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting first check',
  live: 'Live',
  removed: 'Removed',
  error: 'Uncertain',
  finished: '7-day window complete',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-muted',
  live: 'text-live',
  removed: 'text-removed',
  error: 'text-pending',
  finished: 'text-muted',
};

function timeUntil(iso?: string): string {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'due now';
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${mins}m`;
}

function timeAgo(iso?: string): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function VideoCard({
  video,
  now,
  onReplace,
  onDelete,
}: {
  video: TrackedVideo;
  now: number;
  onReplace: (id: string, newUrl: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showReplace, setShowReplace] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const isRemoved = video.status === 'removed';

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <CountdownRing video={video} now={now} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-mono font-semibold uppercase tracking-wide ${STATUS_COLOR[video.status]}`}>
              {STATUS_LABEL[video.status]}
            </span>
            {video.label && (
              <span className="text-xs text-muted font-mono truncate">· {video.label}</span>
            )}
          </div>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-mono text-[#e6e9ed] hover:text-live truncate mt-1"
            title={video.url}
          >
            {video.url}
          </a>
          <div className="flex gap-4 mt-2 text-xs text-muted font-mono">
            <span>checked {timeAgo(video.lastCheckedAt)}</span>
            {isRemoved ? (
              <span className="text-removed">next follow-up in {timeUntil(video.nextFollowUpAt)}</span>
            ) : (
              <span>window ends in {timeUntil(video.trackingEndsAt)}</span>
            )}
          </div>
        </div>
      </div>

      {isRemoved && !showReplace && (
        <button
          onClick={() => setShowReplace(true)}
          className="self-start text-xs font-mono px-3 py-1.5 rounded-md bg-removed/10 text-removed border border-removed/30 hover:bg-removed/20 transition"
        >
          Add replacement link
        </button>
      )}

      {showReplace && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newUrl.trim()) return;
            setBusy(true);
            await onReplace(video.id, newUrl.trim());
            setBusy(false);
            setShowReplace(false);
            setNewUrl('');
          }}
          className="flex gap-2"
        >
          <input
            autoFocus
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://www.tiktok.com/@user/video/..."
            className="flex-1 bg-surface2 border border-border rounded-md px-3 py-2 text-sm font-mono text-[#e6e9ed] placeholder:text-muted focus:outline-none focus:border-live"
          />
          <button
            type="submit"
            disabled={busy}
            className="text-xs font-mono px-3 py-2 rounded-md bg-live/10 text-live border border-live/30 hover:bg-live/20 transition disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Start tracking'}
          </button>
          <button
            type="button"
            onClick={() => setShowReplace(false)}
            className="text-xs font-mono px-3 py-2 rounded-md text-muted hover:text-[#e6e9ed] transition"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-1">
          {video.history.slice(-12).map((h, i) => (
            <span
              key={i}
              title={`${h.result} · ${new Date(h.at).toLocaleString()}`}
              className={`w-1.5 h-4 rounded-sm ${
                h.result === 'live'
                  ? 'bg-live'
                  : h.result === 'removed'
                  ? 'bg-removed'
                  : 'bg-pending'
              }`}
            />
          ))}
          {video.history.length === 0 && (
            <span className="text-xs text-muted font-mono">no checks yet</span>
          )}
        </div>
        <button
          onClick={() => onDelete(video.id)}
          className="text-xs font-mono text-muted hover:text-removed transition"
        >
          Stop tracking
        </button>
      </div>
    </div>
  );
}
