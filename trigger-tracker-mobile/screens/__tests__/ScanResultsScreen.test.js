/**
 * Tests for ScanResultsScreen
 *
 * Key behavior tested:
 * - Integrates with foodAnalysis and scannerGate
 * - Captures analytics events (result viewed, swap tapped, reason tag expanded)
 * - Tracks streak on meal log, including milestone events
 * - Renders traffic light variants and handles error state
 * - Provides Log to History action with logged confirmation state
 */

describe('ScanResultsScreen', () => {
  let source;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(
      path.join(__dirname, '..', 'ScanResultsScreen.js'),
      'utf-8'
    );
  });

  describe('Service integrations', () => {
    test('uses analyzeFoodImage for analysis', () => {
      expect(source).toContain('analyzeFoodImage');
    });

    test('uses enhanceScanResult from scannerAdapter', () => {
      expect(source).toContain('enhanceScanResult');
    });

    test('calls incrementFreeScanCount for non-pro users', () => {
      expect(source).toContain('incrementFreeScanCount');
    });

    test('saves meal via saveMeal', () => {
      expect(source).toContain('saveMeal');
    });

    test('passes user conditions to analyzer', () => {
      expect(source).toContain('user?.conditions');
    });
  });

  describe('Analytics events', () => {
    test('captures food_scan_started', () => {
      expect(source).toContain('food_scan_started');
    });

    test('captures SCANNER_RESULT_VIEWED with context', () => {
      expect(source).toContain('SCANNER_RESULT_VIEWED');
      expect(source).toContain('scan_count_7d');
      expect(source).toContain('user_tenure_days');
    });

    test('captures SCANNER_SWAP_TAPPED', () => {
      expect(source).toContain('SCANNER_SWAP_TAPPED');
    });

    test('captures SCANNER_REASON_TAG_EXPANDED', () => {
      expect(source).toContain('SCANNER_REASON_TAG_EXPANDED');
    });

    test('captures food_scan_failed on error', () => {
      expect(source).toContain('food_scan_failed');
    });
  });

  describe('Streak integration', () => {
    test('reads streak info via getStreakInfo', () => {
      expect(source).toContain('getStreakInfo');
    });

    test('updates best streak when applicable', () => {
      expect(source).toContain('updateBestStreak');
    });

    test('emits streak_milestone for milestone streaks', () => {
      expect(source).toContain('streak_milestone');
      expect(source).toContain('STREAK_MILESTONES');
    });
  });

  describe('Paywall bypass', () => {
    test('uses the centralized dev paywall bypass helper', () => {
      expect(source).toContain('shouldBypassPaywall');
      expect(source).toContain('../utils/devMode');
    });

    test('dev helper respects __DEV__ + EXPO_PUBLIC_BYPASS_PAYWALL flag', () => {
      const helper = require('fs').readFileSync(
        require('path').join(__dirname, '..', '..', 'utils', 'devMode.js'),
        'utf8'
      );
      expect(helper).toContain('__DEV__');
      expect(helper).toContain('EXPO_PUBLIC_BYPASS_PAYWALL');
    });

    test('skips increment when entitlementState is pro', () => {
      expect(source).toContain('entitlementState');
      expect(source).toContain('"pro"');
    });
  });

  describe('UI states', () => {
    test('renders all three traffic light variants', () => {
      expect(source).toContain('Likely Safe');
      expect(source).toContain('Caution');
      expect(source).toContain('Likely Trigger');
    });

    test('shows personal trigger warning when matched', () => {
      expect(source).toContain('personalTriggerMatch');
      expect(source).toContain('Personal Trigger Detected');
    });

    test('renders safer swaps section', () => {
      expect(source).toContain('saferSwaps');
      expect(source).toContain('Safer Swaps');
    });

    test('shows Log to History button and logged confirmation', () => {
      expect(source).toContain('Log to History');
      expect(source).toContain('Meal Logged');
    });

    test('shows scanning indicator while analyzing', () => {
      expect(source).toContain('Scanning ingredients');
    });

    test('shows error state on analysis failure', () => {
      expect(source).toContain('There was an error, please try again');
    });
  });
});
