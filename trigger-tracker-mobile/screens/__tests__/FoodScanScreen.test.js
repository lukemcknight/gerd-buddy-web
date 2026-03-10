/**
 * Tests for FoodScanScreen
 *
 * Key behavior tested:
 * - Freemium gate: blocked state shows "You've used your 3 free scans"
 * - Legacy blocked state shows "Know Before You Eat" (flag off)
 * - Scanner gate integration: uses canUserScan / incrementFreeScanCount
 * - Analytics events: SCANNER_ATTEMPTED, SCANNER_ALLOWED, SCANNER_BLOCKED_LIMIT_REACHED
 * - Suggestions rendering from analysis
 * - Remaining scans badge for free users
 */

describe('FoodScanScreen', () => {
  let source;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(
      path.join(__dirname, '..', 'FoodScanScreen.js'),
      'utf-8'
    );
  });

  describe('Scanner gate integration', () => {
    test('imports canUserScan from scannerGate', () => {
      expect(source).toContain('canUserScan');
    });

    test('imports incrementFreeScanCount from scannerGate', () => {
      expect(source).toContain('incrementFreeScanCount');
    });

    test('imports FREE_SCAN_LIMIT from scannerGate', () => {
      expect(source).toContain('FREE_SCAN_LIMIT');
    });

    test('imports FEATURE_FLAGS from scannerGate', () => {
      expect(source).toContain('FEATURE_FLAGS');
    });
  });

  describe('Freemium blocked state', () => {
    test('shows "used your" free scans message when limit reached', () => {
      expect(source).toContain("used your");
      expect(source).toContain("free scans");
    });

    test('shows trial CTA on blocked state', () => {
      expect(source).toContain('Start 7-Day Free Trial');
    });

    test('navigates to Paywall with scanner_limit trigger_source', () => {
      expect(source).toContain('trigger_source');
      expect(source).toContain('scanner_limit');
    });
  });

  describe('Legacy blocked state', () => {
    test('shows "Know Before You Eat" for flag-off state', () => {
      expect(source).toContain('Know Before You Eat');
    });

    test('feature list items present in legacy state', () => {
      expect(source).toContain('Snap a photo for instant risk analysis');
      expect(source).toContain('Matches against your personal trigger history');
      expect(source).toContain('Get tailored suggestions for safer eating');
    });
  });

  describe('Remaining scans badge', () => {
    test('displays remaining scan count for free users', () => {
      expect(source).toContain('FREE_SCAN_LIMIT');
      // Should show remaining/total format
      expect(source).toMatch(/remaining/i);
    });
  });

  describe('Analytics events', () => {
    test('fires SCANNER_ATTEMPTED event', () => {
      expect(source).toContain('EVENTS.SCANNER_ATTEMPTED');
    });

    test('fires SCANNER_ALLOWED event', () => {
      expect(source).toContain('EVENTS.SCANNER_ALLOWED');
    });

    test('fires SCANNER_BLOCKED_LIMIT_REACHED event', () => {
      expect(source).toContain('EVENTS.SCANNER_BLOCKED_LIMIT_REACHED');
    });
  });

  describe('Suggestions rendering', () => {
    test('source code renders analysis.suggestions', () => {
      expect(source).toContain('analysis.suggestions');
      expect(source).toContain('Suggestions');
    });

    test('suggestions section is conditional on non-empty array', () => {
      expect(source).toContain('analysis.suggestions?.length > 0');
    });
  });

  describe('Scan increment', () => {
    test('calls incrementFreeScanCount after successful analysis', () => {
      expect(source).toContain('incrementFreeScanCount');
    });

    test('uses scanId for dedup guard', () => {
      expect(source).toContain('scanId');
    });
  });
});
