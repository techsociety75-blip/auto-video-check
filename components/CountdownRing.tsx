'use client';

import type { TrackedVideo } from '@/lib/types';

const SIZE = 64;
const STROKE = 5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function CountdownRing({ video, now }: { video: TrackedVideo; now: number }) {
  const addedAt = new Date(video.addedAt).getTime();
  const trackingEndsAt = new Date(video.trackingEndsAt).getTime();

  let fraction: number; // 0 = just started, 1 = window complete
  let colorClass: string;
  let pulse = false;

  if (video.status === 'removed' || video.status === 'finished') {
    if (video.status === 'removed' && video.nextFollowUpAt) {
      const followUpAt = new Date(video.nextFollowUpAt).getTime();
      const removedAt = video.removedAt ? new Date(video.removedAt).getTime() : addedAt;
      const span = followUpAt - removedAt || 1;
      fraction = clamp((now - removedAt) / span, 0, 1);
      colorClass = 'stroke-removed';
      pulse = true;
    } else {
      fraction = 1;
      colorClass = video.status === 'finished' ? 'stroke-muted' : 'stroke-removed';
    }
  } else {
    const span = trackingEndsAt - addedAt || 1;
    fraction = clamp((now - addedAt) / span, 0, 1);
    colorClass =
      video.status === 'live' ? 'stroke-live' : video.status === 'error' ? 'stroke-pending' : 'stroke-muted';
  }

  const dashOffset = CIRC * (1 - fraction);

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className={pulse ? 'pulse-removed' : ''}>
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="#262b33"
        strokeWidth={STROKE}
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        className={colorClass}
        strokeWidth={STROKE}
        strokeDasharray={CIRC}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}
