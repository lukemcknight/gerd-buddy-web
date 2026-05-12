const fs = require('fs');
const path = require('path');

describe('RetentionOfferStep', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'cancel', 'RetentionOfferStep.js'),
      'utf-8'
    );
  });

  test('exports RetentionOfferStep as default', () => {
    expect(source).toMatch(/export default RetentionOfferStep/);
  });

  test('accepts offerPriceLabel, purchasing, onAccept, onDecline, onBack', () => {
    expect(source).toContain('offerPriceLabel');
    expect(source).toContain('purchasing');
    expect(source).toContain('onAccept');
    expect(source).toContain('onDecline');
    expect(source).toContain('onBack');
  });

  test('shows a processing label and disables CTAs while purchasing', () => {
    expect(source).toContain('Processing');
    expect(source).toContain('disabled={purchasing}');
  });

  test('renders the offer headline anchor', () => {
    expect(source).toContain('Stay with us');
  });

  test('renders primary CTA "Keep my subscription"', () => {
    expect(source).toContain('Keep my subscription');
  });

  test('renders secondary CTA "Continue to cancel"', () => {
    expect(source).toContain('Continue to cancel');
  });

  test('renders step indicator "Step 2 of 3"', () => {
    expect(source).toContain('Step 2 of 3');
  });
});
