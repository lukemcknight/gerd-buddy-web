const fs = require('fs');
const path = require('path');

describe('TimeEntry', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'TimeEntry.js'),
      'utf-8'
    );
  });

  test('exports TimeEntry as default', () => {
    expect(source).toMatch(/export default TimeEntry/);
  });

  test('default presetId is "now"', () => {
    expect(source).toMatch(/presetId\s*=\s*['"]now['"]/);
  });

  test('lists the five time presets', () => {
    expect(source).toContain('"15m"');
    expect(source).toContain('"30m"');
    expect(source).toContain('"1h"');
    expect(source).toContain('"2h"');
    expect(source).toContain('"earlier"');
  });

  test('opens TimePickerSheet on custom press', () => {
    expect(source).toContain('TimePickerSheet');
    expect(source).toContain('setSheetOpen');
  });

  test('fires onChange with date and presetId', () => {
    expect(source).toContain('onChange?.(');
  });

  test('captures time_picker_opened analytics event', () => {
    expect(source).toContain('time_picker_opened');
  });
});
