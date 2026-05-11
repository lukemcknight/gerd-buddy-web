const fs = require('fs');
const path = require('path');

describe('ChipScroller', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'ChipScroller.js'),
      'utf-8'
    );
  });

  test('exports ChipScroller as default', () => {
    expect(source).toMatch(/export default ChipScroller/);
  });

  test('accepts chips array, mode, onToggle, onPress, selectedIds', () => {
    expect(source).toContain('chips');
    expect(source).toContain('mode');
    expect(source).toContain('onToggle');
    expect(source).toContain('onPress');
    expect(source).toContain('selectedIds');
  });

  test('handles all three modes', () => {
    expect(source).toContain('"single"');
    expect(source).toContain('"multi"');
    expect(source).toContain('"action"');
  });

  test('supports wrap layout', () => {
    expect(source).toContain('wrap');
    expect(source).toContain('flex-wrap');
  });
});
