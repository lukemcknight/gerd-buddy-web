const {
  CANCELLATION_REASONS,
  isOtherReason,
  reasonLabelFor,
} = require('../cancellationReasons');

describe('cancellationReasons', () => {
  test('exports six reasons in stable order', () => {
    expect(CANCELLATION_REASONS).toHaveLength(6);
    expect(CANCELLATION_REASONS.map((r) => r.id)).toEqual([
      'too_expensive',
      'not_using_enough',
      'missing_features',
      'found_better_app',
      'gerd_improved',
      'other',
    ]);
  });

  test('each reason has id + label', () => {
    for (const r of CANCELLATION_REASONS) {
      expect(typeof r.id).toBe('string');
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(0);
    }
  });

  test('isOtherReason returns true only for "other"', () => {
    expect(isOtherReason('other')).toBe(true);
    expect(isOtherReason('too_expensive')).toBe(false);
    expect(isOtherReason(null)).toBe(false);
    expect(isOtherReason(undefined)).toBe(false);
  });

  test('reasonLabelFor returns label for known id', () => {
    expect(reasonLabelFor('too_expensive')).toBe('Too expensive');
  });

  test('reasonLabelFor returns null for unknown id', () => {
    expect(reasonLabelFor('nope')).toBeNull();
    expect(reasonLabelFor(null)).toBeNull();
  });
});
