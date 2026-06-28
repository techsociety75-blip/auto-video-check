export type CheckResult = {
  status: 'live' | 'removed' | 'error';
  detail: string;
};

const REMOVED_MARKERS = [
  'video currently unavailable',
  'this video is unavailable',
  'video unavailable',
  'content unavailable',
  "couldn't find this account",
  'page not available',
  '/exception',
];

const BLOCKED_MARKERS = [
  'captcha',
  'verify you are human',
  'access denied',
];

/**
 * Attempts to determine whether a TikTok video URL is still live.
 *
 * IMPORTANT CAVEAT: TikTok actively blocks server-side / bot requests with
 * CAPTCHAs or empty shells. This check is best-effort. When TikTok's anti-bot
 * page is detected, we return 'error' (uncertain) rather than guessing,
 * so the app never falsely reports a removal.
 */
export async function checkTikTokVideo(url: string): Promise<CheckResult> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // TikTok responses can be large; cap how long we wait
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 404 || res.status === 410) {
      return { status: 'removed', detail: `HTTP ${res.status}` };
    }

    if (!res.ok) {
      return { status: 'error', detail: `HTTP ${res.status}` };
    }

    const html = (await res.text()).toLowerCase();

    if (BLOCKED_MARKERS.some((m) => html.includes(m))) {
      return { status: 'error', detail: 'Blocked by anti-bot page (uncertain)' };
    }

    if (REMOVED_MARKERS.some((m) => html.includes(m))) {
      return { status: 'removed', detail: 'Removal marker found on page' };
    }

    // Heuristic: a live TikTok video page is large (contains the SIGI_STATE
    // JSON blob with video data). A removed/blocked page is often much smaller.
    if (html.includes('sigi_state') || html.includes('"video"')) {
      return { status: 'live', detail: 'Video data found on page' };
    }

    if (html.length < 2000) {
      return { status: 'error', detail: 'Page too small to confirm (uncertain)' };
    }

    return { status: 'error', detail: 'Could not confirm status from page content' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown fetch error';
    return { status: 'error', detail: message };
  }
}
