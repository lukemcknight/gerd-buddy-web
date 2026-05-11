const fs = require('fs');
const path = require('path');

describe('TimePickerSheet', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'TimePickerSheet.js'),
      'utf-8'
    );
  });

  test('exports TimePickerSheet as default', () => {
    expect(source).toMatch(/export default TimePickerSheet/);
  });

  test('builds last 7 days only (no future)', () => {
    expect(source).toContain('7');
    expect(source).toMatch(/Today|Yesterday/);
  });

  test('minute options are 5-minute steps', () => {
    expect(source).toMatch(/i \* 5|step.*5/);
  });

  test('exposes visible, initialDate, onCancel, onConfirm', () => {
    expect(source).toContain('visible');
    expect(source).toContain('initialDate');
    expect(source).toContain('onCancel');
    expect(source).toContain('onConfirm');
  });

  test('haptic on wheel detent', () => {
    expect(source).toContain("from 'expo-haptics'");
  });
});
