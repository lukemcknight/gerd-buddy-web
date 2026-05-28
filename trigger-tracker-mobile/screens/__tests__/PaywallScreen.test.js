/**
 * Tests for PaywallScreen messaging + structure.
 *
 * These tests source-grep the file rather than rendering the screen
 * because the screen depends on RevenueCat / SafeArea / navigation
 * which aren't worth standing up in jsdom. They're guard rails against
 * regressing key copy and behavior, not full integration tests.
 */

describe('PaywallScreen - Pro messaging', () => {
  let source;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(
      path.join(__dirname, '..', 'PaywallScreen.tsx'),
      'utf-8'
    );
  });

  describe('Headline', () => {
    test('default headline matches the new layout', () => {
      expect(source).toContain('Build your doctor-ready trigger report.');
    });

    test('does not hardcode a stale 7-day trial length', () => {
      // Local trial config in storage.js is 3 days; "7 days" is stale copy.
      expect(source).not.toMatch(/7[- ]day/i);
    });
  });

  describe('Benefits list', () => {
    test('includes scan benefit (new copy)', () => {
      expect(source).toContain('Scan meals into evidence');
    });

    test('includes AI Q&A benefit (flagship)', () => {
      expect(source).toContain('Ask GERDBuddy AI');
    });

    test('includes doctor visit-prep benefit', () => {
      expect(source).toContain('Doctor-ready GI visit prep');
    });
  });

  describe('CTA text', () => {
    test('fallback CTA is "Unlock Pro"', () => {
      expect(source).toContain('"Unlock Pro"');
    });

    test('does not use old "Unlock Meal Scanner" fallback', () => {
      expect(source).not.toContain('"Unlock Meal Scanner"');
    });

    test('trial CTA copy is in the file', () => {
      expect(source).toContain('Start your 3-day trial');
    });
  });

  describe('Scanner limit contextual messaging', () => {
    test('has scanner_limit headline pointing at Pro scans', () => {
      expect(source).toContain('Keep scanning with Pro');
    });

    test('has scanner_limit subtext about free scans', () => {
      expect(source).toContain("You've used your 3 free scans");
    });

    test('checks trigger_source for scanner_limit', () => {
      expect(source).toContain('scanner_limit');
      expect(source).toContain('isScannerLimit');
    });

    test('scanner_limit gets a Pro-scans-specific CTA', () => {
      expect(source).toContain('"Unlock Pro Scans"');
    });
  });

  describe('Delayed close button', () => {
    test('declares CLOSE_BUTTON_DELAY_MS constant', () => {
      expect(source).toMatch(/const CLOSE_BUTTON_DELAY_MS\s*=\s*\d+/);
    });

    test('back button is visible on hard-paywall or after canClose dwell elapses', () => {
      // The redesigned layout shows back chevron when isHardPaywall (so the
      // user can step back through the funnel) OR after the dwell timer fires.
      expect(source).toMatch(/isHardPaywall \|\| canClose/);
    });

    test('canClose initializes from shouldBypassPaywall (dev/expo skip the delay)', () => {
      expect(source).toContain('useState(shouldBypassPaywall)');
    });

    test('schedules setCanClose via setTimeout with the delay constant', () => {
      expect(source).toMatch(/setTimeout\(\(\) => setCanClose\(true\), CLOSE_BUTTON_DELAY_MS\)/);
    });
  });

  describe('Single-offering selection', () => {
    test('does not reference the removed selectOfferingForUser helper', () => {
      expect(source).not.toContain('selectOfferingForUser');
    });

    test('prefers offerings.current but falls back to any offering with packages', () => {
      expect(source).toContain('offerings?.current');
      expect(source).toContain('offerings?.all');
      expect(source).toMatch(/\.find\(hasPackages\)/);
    });
  });

  describe('Analytics', () => {
    test('tracks paywall_viewed event', () => {
      expect(source).toContain('EVENTS.PAYWALL_VIEWED');
    });

    test('tracks paywall_triggered event', () => {
      expect(source).toContain('EVENTS.PAYWALL_TRIGGERED');
    });

    test('tracks trial_started event', () => {
      expect(source).toContain('EVENTS.TRIAL_STARTED');
    });

    test('tracks purchase_completed event', () => {
      expect(source).toContain('EVENTS.PURCHASE_COMPLETED');
    });

    test('tracks purchase_restored event', () => {
      expect(source).toContain('EVENTS.PURCHASE_RESTORED');
    });

    test('passes trigger_source to events', () => {
      expect(source).toContain('trigger_source');
    });
  });
});
