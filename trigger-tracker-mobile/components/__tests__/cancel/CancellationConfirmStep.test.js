const fs = require('fs');
const path = require('path');

describe('CancellationConfirmStep', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'cancel', 'CancellationConfirmStep.js'),
      'utf-8'
    );
  });

  test('exports CancellationConfirmStep as default', () => {
    expect(source).toMatch(/export default CancellationConfirmStep/);
  });

  test('accepts onBack, onOpenAppStore, onAbort', () => {
    expect(source).toContain('onBack');
    expect(source).toContain('onOpenAppStore');
    expect(source).toContain('onAbort');
  });

  test('renders Apple-compliance copy about App Store', () => {
    expect(source).toContain('App Store');
  });

  test('renders primary CTA "Open App Store"', () => {
    expect(source).toContain('Open App Store');
  });

  test('renders abort link to keep subscription', () => {
    expect(source).toContain('Never mind');
  });

  test('renders step indicator "Step 3 of 3"', () => {
    expect(source).toContain('Step 3 of 3');
  });
});
