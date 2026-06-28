import type { TrackedVideo } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const TRACKING_WINDOW_DAYS = 7;
const FOLLOWUP_HOURS = 3;

export function makeNewVideo(url: string, label?: string): TrackedVideo {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    url,
    label,
    addedAt: now.toISOString(),
    status: 'pending',
    history: [],
    trackingEndsAt: new Date(now.getTime() + TRACKING_WINDOW_DAYS * DAY_MS).toISOString(),
  };
}

/**
 * A video is "due" for a check right now if:
 * - it's still within its 7-day tracking window (or already removed, in
 *   which case it follows the 3-hour cadence indefinitely until replaced), AND
 * - either it has never been checked, or enough time has passed since the
 *   last check / since nextFollowUpAt.
 */
export function isDue(video: TrackedVideo, now: Date = new Date()): boolean {
  if (video.status === 'finished') return false;

  const trackingEnded = now.getTime() > new Date(video.trackingEndsAt).getTime();

  if (video.status === 'removed') {
    // Once removed, keep checking every 3 hours regardless of the 7-day
    // window, until the user swaps in a new link (handled by the API layer).
    if (!video.nextFollowUpAt) return true;
    return now.getTime() >= new Date(video.nextFollowUpAt).getTime();
  }

  // Not yet known to be removed.
  if (trackingEnded) {
    return false; // 7-day window is up; stop checking, mark finished elsewhere
  }

  if (!video.lastCheckedAt) return true;

  // While live/pending within the 7-day window, check at most once per cron
  // run (daily on Hobby plan) — no need to throttle further than "once since
  // last check".
  const sinceLast = now.getTime() - new Date(video.lastCheckedAt).getTime();
  return sinceLast >= HOUR_MS; // allow re-check if an hour+ has passed
}

export function applyCheckResult(
  video: TrackedVideo,
  result: { status: 'live' | 'removed' | 'error'; detail: string },
  now: Date = new Date()
): TrackedVideo {
  const updated: TrackedVideo = {
    ...video,
    lastCheckedAt: now.toISOString(),
    history: [
      ...video.history,
      { at: now.toISOString(), result: result.status, detail: result.detail },
    ].slice(-50), // keep history bounded
  };

  if (result.status === 'error') {
    // Don't overwrite a known status with uncertainty; just log it.
    updated.status = video.status === 'pending' ? 'error' : video.status;
    return updated;
  }

  if (result.status === 'removed') {
    if (video.status !== 'removed') {
      updated.removedAt = now.toISOString();
      updated.notified = false; // trigger a fresh notification
    }
    updated.status = 'removed';
    updated.nextFollowUpAt = new Date(now.getTime() + FOLLOWUP_HOURS * HOUR_MS).toISOString();
    return updated;
  }

  // status === 'live'
  updated.status = 'live';
  updated.removedAt = undefined;
  updated.nextFollowUpAt = undefined;

  const trackingEnded = now.getTime() > new Date(video.trackingEndsAt).getTime();
  if (trackingEnded) {
    updated.status = 'finished';
  }

  return updated;
}

export const CONFIG = {
  TRACKING_WINDOW_DAYS,
  FOLLOWUP_HOURS,
};
