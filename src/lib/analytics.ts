import { posts } from '../content/blog';

export const WEB_EVENTS = { APP_STORE_CLICKED: 'web_app_store_clicked' } as const;

type Analytics = {
  capture: (event: string, properties: Record<string, unknown>) => unknown;
  has_opted_out_capturing?: () => boolean;
};
type ClickContext = {
  href: string;
  hostname: string;
  pathname: string;
  placement: string;
  doNotTrack: string | null;
  referrer: string;
};

declare global {
  interface Window { posthog?: Analytics; gerdbuddyBeforeSend?: typeof sanitizeWebEvent }
}

const publicPaths = new Set(['/', '/blog', '/privacy', '/terms', ...posts.map(post => `/blog/${post.slug}`)]);
const placements = new Set(['header', 'footer', 'article', 'content']);

// Count outbound intent, not installs. Never include clicked text, forum ids,
// query strings, or form values in the event. Navigation never waits on analytics.
export function captureAppStoreClick(context: ClickContext, analytics: Analytics | undefined): void {
  try {
    if (!analytics || !['gerdbuddy.app', 'www.gerdbuddy.app'].includes(context.hostname)) return;
    if (['1', 'yes'].includes(context.doNotTrack || '') || analytics.has_opted_out_capturing?.()) return;
    const destination = new URL(context.href);
    if (destination.protocol !== 'https:' || destination.hostname !== 'apps.apple.com' || !/\/id6756620910\/?$/.test(destination.pathname)) return;
    const pagePath = publicPaths.has(context.pathname) ? context.pathname : context.pathname.startsWith('/forum') ? '/forum' : '/other';
    let referrer = '';
    try {
      const url = new URL(context.referrer);
      if (['http:', 'https:'].includes(url.protocol)) referrer = `${url.origin}/`;
    } catch { /* Direct visit or unavailable referrer. */ }
    analytics.capture(WEB_EVENTS.APP_STORE_CLICKED, {
      page_path: pagePath,
      placement: placements.has(context.placement) ? context.placement : 'content',
      app_store_id: '6756620910',
      $current_url: `https://www.gerdbuddy.app${pagePath}`,
      $pathname: pagePath,
      $title: 'GERDBuddy',
      $referrer: referrer,
    });
  } catch { /* A blocked or failing analytics SDK must not interrupt the link. */ }
}

export function installAppStoreClickTracking(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(link instanceof HTMLAnchorElement)) return;
    const placement = link.closest('header, nav') ? 'header' : link.closest('footer') ? 'footer' : link.closest('article') ? 'article' : 'content';
    captureAppStoreClick({
      href: link.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      placement,
      doNotTrack: navigator.doNotTrack,
      referrer: document.referrer,
    }, window.posthog);
  };
  document.addEventListener('click', onClick);
  document.addEventListener('auxclick', onClick);
  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('auxclick', onClick);
  };
}

type CaptureEvent = { event: string; properties: Record<string, unknown>; [key: string]: unknown };
// PostHog adds session-entry URLs and attribution after capture(). Filter at
// before_send, after that enrichment, so private navigation cannot leak here.
const clickPropertyAllowlist = new Set([
  'token', 'distinct_id', '$device_id', '$session_id', '$window_id', '$lib', '$lib_version',
  'page_path', 'placement', 'app_store_id', '$current_url', '$pathname', '$title', '$referrer',
]);
export function sanitizeWebEvent(event: CaptureEvent): CaptureEvent {
  if (event.event !== WEB_EVENTS.APP_STORE_CLICKED) return event;
  return {
    ...event,
    properties: Object.fromEntries(Object.entries(event.properties).filter(([key]) => clickPropertyAllowlist.has(key))),
  };
}
