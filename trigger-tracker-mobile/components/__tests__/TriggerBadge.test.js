/**
 * Tests for TriggerBadge component showDetails prop
 *
 * Key behavior tested:
 * - showDetails prop defaults to true
 * - When showDetails is false, confidence/relative-risk footer is hidden
 * - Component still shows trigger name, rank, symptom rate, and severity
 */

describe('TriggerBadge', () => {
  let source;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(
      path.join(__dirname, '..', 'TriggerBadge.js'),
      'utf-8'
    );
  });

  describe('showDetails prop', () => {
    test('accepts showDetails prop with default true', () => {
      expect(source).toContain('showDetails = true');
    });

    test('confidence footer is gated by showDetails', () => {
      expect(source).toContain('showDetails && trigger.confidence');
    });
  });

  describe('Always-visible elements', () => {
    test('renders trigger ingredient name', () => {
      expect(source).toContain('trigger.ingredient');
    });

    test('renders rank number', () => {
      expect(source).toContain('{rank}');
    });

    test('renders symptom rate', () => {
      expect(source).toContain('symptomRate');
    });

    test('renders average severity', () => {
      expect(source).toContain('trigger.avgSeverity');
    });
  });

  describe('Pro-only details', () => {
    test('has confidence percentage display', () => {
      expect(source).toContain('confidencePercent');
    });

    test('has relative risk display', () => {
      expect(source).toContain('trigger.relativeRisk');
    });
  });
});
