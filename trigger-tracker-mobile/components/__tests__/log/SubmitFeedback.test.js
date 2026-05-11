const fs = require('fs');
const path = require('path');

describe('SubmitFeedback', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'SubmitFeedback.js'),
      'utf-8'
    );
  });

  test('exports SubmitFeedback as default', () => {
    expect(source).toMatch(/export default SubmitFeedback/);
  });

  test('accepts variant prop with checkmark and buddy', () => {
    expect(source).toContain('"checkmark"');
    expect(source).toContain('"buddy"');
  });

  test('checks reducedMotion via AccessibilityInfo', () => {
    expect(source).toContain('AccessibilityInfo');
    expect(source).toContain('isReduceMotionEnabled');
  });

  test('uses expo-haptics on submit', () => {
    expect(source).toContain("from 'expo-haptics'");
    expect(source).toContain('notificationAsync');
  });

  test('renders an animated checkmark via react-native-svg', () => {
    expect(source).toContain('react-native-svg');
    expect(source).toContain('strokeDashoffset');
  });

  test('renders buddy turtle and heart particle (variant="buddy")', () => {
    expect(source).toContain('turtle_happy');
    expect(source).toContain('heart');
  });
});
