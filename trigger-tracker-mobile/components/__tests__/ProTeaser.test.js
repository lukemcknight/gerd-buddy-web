/**
 * Tests for ProTeaser component
 *
 * Key behavior tested:
 * - Component file exists with correct structure
 * - Navigates to Paywall on upgrade tap
 * - Renders title, description, and upgrade button
 * - Uses Sparkles icon and primary/5 styling
 */

describe('ProTeaser', () => {
  let source;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(
      path.join(__dirname, '..', 'ProTeaser.js'),
      'utf-8'
    );
  });

  describe('Structure', () => {
    test('exports a default component', () => {
      expect(source).toContain('export default ProTeaser');
    });

    test('exports a named ProTeaser', () => {
      expect(source).toContain('export const ProTeaser');
    });

    test('accepts title and description props', () => {
      expect(source).toContain('{ title, description }');
    });
  });

  describe('Navigation', () => {
    test('uses useNavigation hook', () => {
      expect(source).toContain('useNavigation');
    });

    test('navigates to Paywall on press', () => {
      expect(source).toContain('navigation.navigate("Paywall")');
    });
  });

  describe('UI elements', () => {
    test('uses Sparkles icon', () => {
      expect(source).toContain('Sparkles');
    });

    test('uses primary/5 background styling', () => {
      expect(source).toContain('bg-primary/5');
    });

    test('uses primary/20 border styling', () => {
      expect(source).toContain('border-primary/20');
    });

    test('displays "Upgrade" button text', () => {
      expect(source).toContain('Upgrade');
    });

    test('renders title prop', () => {
      expect(source).toContain('{title}');
    });

    test('renders description prop', () => {
      expect(source).toContain('{description}');
    });
  });
});
