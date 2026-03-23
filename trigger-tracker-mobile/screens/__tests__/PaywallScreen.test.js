/**
 * Tests for PaywallScreen messaging updates
 *
 * Key behavior tested:
 * - Headline reads "Find your top reflux triggers in 14 days." (outcomes-based)
 * - Subtitle mentions trigger analysis, detailed reports, and scanning
 * - Benefits list covers scanner, triggers, analytics, sharing
 * - CTA fallback text is "Unlock Pro" (not "Unlock Meal Scanner")
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
    test('shows outcomes-based headline', () => {
      expect(source).toContain('Find your top triggers in 14 days.');
    });

    test('headline is in the main heading element', () => {
      const headlineMatch = source.match(/text-2xl font-extrabold[^>]*>[^<]*/);
      expect(headlineMatch).toBeTruthy();
      expect(headlineMatch[0]).toContain('Find your top triggers in 14 days.');
    });
  });

  describe('Subtitle', () => {
    test('mentions trigger analysis', () => {
      expect(source).toContain('trigger analysis');
    });

    test('mentions detailed reports', () => {
      expect(source).toContain('detailed reports');
    });

    test('mentions scanning', () => {
      expect(source).toContain('scanning');
    });
  });

  describe('Benefits list', () => {
    test('includes meal scanning benefit', () => {
      expect(source).toContain('Scan any meal');
    });

    test('includes trigger analysis benefit', () => {
      expect(source).toContain('Full trigger analysis with confidence scores');
    });

    test('includes detailed analytics benefit', () => {
      expect(source).toContain('Detailed analytics');
    });

    test('includes sharing benefit', () => {
      expect(source).toContain('Share your pattern reports');
    });
  });

  describe('CTA text', () => {
    test('fallback CTA is "Unlock Pro"', () => {
      expect(source).toContain('"Unlock Pro"');
    });

    test('does not use old "Unlock Meal Scanner" fallback', () => {
      expect(source).not.toContain('"Unlock Meal Scanner"');
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
  });
});
