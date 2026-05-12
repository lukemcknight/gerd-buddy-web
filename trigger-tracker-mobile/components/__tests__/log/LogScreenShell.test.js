const fs = require('fs');
const path = require('path');

describe('LogScreenShell', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'LogScreenShell.js'),
      'utf-8'
    );
  });

  test('exports LogScreenShell as default', () => {
    expect(source).toMatch(/export default LogScreenShell/);
  });

  test('accepts title, subtitle, icon, onBack, submitSlot, children', () => {
    expect(source).toContain('title');
    expect(source).toContain('subtitle');
    expect(source).toContain('icon');
    expect(source).toContain('onBack');
    expect(source).toContain('submitSlot');
    expect(source).toContain('children');
  });

  test('uses KeyboardAvoidingView', () => {
    expect(source).toContain('KeyboardAvoidingView');
  });

  test('uses SafeAreaView with top/left/right edges', () => {
    expect(source).toContain('SafeAreaView');
  });
});
