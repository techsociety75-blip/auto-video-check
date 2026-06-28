'use client';

import { useState } from 'react';

export function AddVideoForm({ onAdd }: { onAdd: (url: string, label?: string) => Promise<string | null> }) {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!url.trim()) return;
        setBusy(true);
        setError(null);
        const err = await onAdd(url.trim(), label.trim() || undefined);
        setBusy(false);
        if (err) {
          setError(err);
        } else {
          setUrl('');
          setLabel('');
        }
      }}
      className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3"
    >
      <div className="flex gap-2 flex-wrap">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@user/video/..."
          className="flex-[2] min-w-[260px] bg-surface2 border border-border rounded-md px-3 py-2.5 text-sm font-mono text-[#e6e9ed] placeholder:text-muted focus:outline-none focus:border-live"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional)"
          className="flex-1 min-w-[160px] bg-surface2 border border-border rounded-md px-3 py-2.5 text-sm font-mono text-[#e6e9ed] placeholder:text-muted focus:outline-none focus:border-live"
        />
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2.5 rounded-md bg-live text-bg font-mono text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {busy ? 'Adding…' : 'Track video'}
        </button>
      </div>
      {error && <p className="text-xs font-mono text-removed">{error}</p>}
      <p className="text-xs font-mono text-muted">
        Tracked for 7 days. If removed, re-checked every 3 hours until you add a replacement link.
      </p>
    </form>
  );
}
