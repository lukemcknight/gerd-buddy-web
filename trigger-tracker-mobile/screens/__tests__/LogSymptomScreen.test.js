const fs = require('fs');
const path = require('path');

describe('LogSymptomScreen redesign', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'LogSymptomScreen.js'),
      'utf-8'
    );
  });

  test('uses the new shared log primitives', () => {
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/LogScreenShell['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/ChipScroller['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/SeverityDots['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/TimeEntry['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/SubmitFeedback['"]/);
  });

  test('no longer imports the old SeveritySlider or native DateTimePicker', () => {
    expect(source).not.toContain('SeveritySlider');
    expect(source).not.toContain('@react-native-community/datetimepicker');
  });

  test('uses checkmark variant on submit', () => {
    expect(source).toMatch(/variant\s*=\s*['"]checkmark['"]/);
  });

  test('calls saveSymptom with preserved payload shape', () => {
    expect(source).toContain('saveSymptom');
    expect(source).toContain('severity');
    expect(source).toContain('symptomTypes');
    expect(source).toContain('timestamp');
    expect(source).toContain('notes');
  });

  test('fires symptom_logged analytics with new severity_input field', () => {
    expect(source).toContain('symptom_logged');
    expect(source).toContain('severity_input');
    expect(source).toContain('time_preset');
  });
});
