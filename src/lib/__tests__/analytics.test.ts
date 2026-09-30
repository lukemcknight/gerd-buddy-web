import assert from 'node:assert/strict';
import test from 'node:test';
import { captureAppStoreClick, WEB_EVENTS } from '../analytics.ts';

const input = {
  href: 'https://apps.apple.com/us/app/gerdbuddy-acid-reflux-relief/id6756620910',
  hostname: 'www.gerdbuddy.app',
  pathname: '/blog/gerd-and-coffee',
  placement: 'article',
  doNotTrack: null,
  referrer: 'https://www.google.com/search?q=private+health+detail',
};

test('records a GERDBuddy outbound click with only public page context', () => {
  const events: unknown[][] = [];
  captureAppStoreClick(input, { capture: (...args: unknown[]) => events.push(args) });
  assert.equal(events.length, 1);
  assert.equal(events[0][0], WEB_EVENTS.APP_STORE_CLICKED);
  const props = events[0][1] as Record<string, unknown>;
  assert.equal(props.page_path, '/blog/gerd-and-coffee');
  assert.equal(props.placement, 'article');
  assert.equal(props.$referrer, 'https://www.google.com/');
  assert.ok(!JSON.stringify(events).includes('private'));
});

test('ignores preview hosts, Do Not Track, opt-outs, and unrelated or deceptive links', () => {
  let count = 0;
  const analytics = { capture: () => { count++; } };
  for (const patch of [
    { hostname: 'localhost' }, { hostname: 'preview.vercel.app' }, { doNotTrack: '1' }, { doNotTrack: 'yes' },
    { href: 'https://apps.apple.com/us/app/id405231632' },
    { href: 'https://apps.apple.com.evil.example/id6756620910' },
    { href: 'https://apps.apple.com/us/app/id67566209100' },
    { href: 'not a url' },
  ]) captureAppStoreClick({ ...input, ...patch }, analytics);
  captureAppStoreClick(input, { ...analytics, has_opted_out_capturing: () => true });
  assert.equal(count, 0);
});

test('does not expose forum ids, unknown paths, link queries, or arbitrary placement labels', () => {
  for (const pathname of ['/forum/food-and-triggers/private-id', '/profile/private-id', '/blog/private-health-detail']) {
    let props: Record<string, unknown> = {};
    captureAppStoreClick({ ...input, pathname, href: `${input.href}?private=1`, placement: 'private detail' }, {
      capture: (_event, properties) => { props = properties; },
    });
    assert.equal(props.app_store_id, '6756620910');
    assert.ok(!JSON.stringify(props).includes('private'));
    assert.ok(!JSON.stringify(props).includes('?'));
    assert.equal(props.placement, 'content');
  }
});

test('analytics failures or a blocked SDK never prevent navigation', () => {
  assert.doesNotThrow(() => captureAppStoreClick(input, undefined));
  assert.doesNotThrow(() => captureAppStoreClick(input, { capture: () => { throw new Error('blocked'); } }));
});

import { sanitizeWebEvent } from '../analytics.ts';

test('filters SDK-enriched session, attribution, and person data before click transmission', () => {
  const event = {
    event: WEB_EVENTS.APP_STORE_CLICKED,
    properties: {
      token: 'project-token', distinct_id: 'anonymous-id', $session_id: 'session-id',
      $process_person_profile: false, $is_identified: false,
      page_path: '/forum', placement: 'header', app_store_id: '6756620910',
      $session_entry_url: 'https://www.gerdbuddy.app/forum/private-id?detail=private',
      $session_entry_pathname: '/forum/private-id', $session_entry_referrer: 'https://example.com/?private=1',
      $initial_current_url: 'https://example.com/private', utm_term: 'private', $set: { name: 'private' },
    },
  };
  const filtered = sanitizeWebEvent(event);
  assert.equal(filtered.properties.token, 'project-token');
  assert.equal(filtered.properties.distinct_id, 'anonymous-id');
  assert.equal(filtered.properties.$session_id, 'session-id');
  assert.equal(filtered.properties.$process_person_profile, false);
  assert.equal(filtered.properties.$is_identified, false);
  assert.equal(filtered.properties.page_path, '/forum');
  assert.ok(!JSON.stringify(filtered).includes('private'));
  const pageview = { ...event, event: '$pageview' };
  assert.equal(sanitizeWebEvent(pageview), pageview);
});
