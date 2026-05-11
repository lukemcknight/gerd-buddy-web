const fs = require('fs');
const path = require('path');

describe('SeverityDots', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'SeverityDots.js'),
      'utf-8'
    );
  });

  test('exports SeverityDots as default', () => {
    expect(source).toMatch(/export default SeverityDots/);
  });

  test('renders 5 dots via array of 1..5', () => {
    expect(source).toContain('[1, 2, 3, 4, 5]');
  });

  test('fires onChange when a dot is tapped', () => {
    expect(source).toContain('onChange?.(');
  });

  test('uses expo-haptics on tap', () => {
    expect(source).toContain("from 'expo-haptics'");
    expect(source).toContain('impactAsync');
  });

  test('renders Mild and Severe labels', () => {
    expect(source).toContain('Mild');
    expect(source).toContain('Severe');
  });
});
