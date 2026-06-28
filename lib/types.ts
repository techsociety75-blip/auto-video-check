export type VideoStatus = 'pending' | 'live' | 'removed' | 'error' | 'finished';

export interface TrackedVideo {
  id: string;
  url: string;
  label?: string;
  addedAt: string; // ISO timestamp
  status: VideoStatus;
  lastCheckedAt?: string; // ISO timestamp
  removedAt?: string; // ISO timestamp - when it was first detected removed
  nextFollowUpAt?: string; // ISO timestamp - for the 3-hour follow-up cadence
  history: VideoCheckEvent[];
  // 7-day tracking window
  trackingEndsAt: string; // ISO timestamp = addedAt + 7 days
  notified?: boolean; // whether the removal Telegram message was already sent
}

export interface VideoCheckEvent {
  at: string; // ISO timestamp
  result: VideoStatus;
  detail?: string;
}

export interface Store {
  videos: TrackedVideo[];
}
