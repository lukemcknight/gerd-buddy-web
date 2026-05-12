const fs = require('fs');
const path = require('path');

describe('CancellationReasonStep', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'cancel', 'CancellationReasonStep.js'),
      'utf-8'
    );
  });

  test('exports CancellationReasonStep as default', () => {
    expect(source).toMatch(/export default CancellationReasonStep/);
  });

  test('imports CANCELLATION_REASONS', () => {
    expect(source).toContain('CANCELLATION_REASONS');
    expect(source).toMatch(/from ['"]\.\.\/\.\.\/services\/cancellationReasons['"]/);
  });

  test('accepts selectedId, otherText, onSelect, onOtherTextChange, onBack, onContinue', () => {
    expect(source).toContain('selectedId');
    expect(source).toContain('otherText');
    expect(source).toContain('onSelect');
    expect(source).toContain('onOtherTextChange');
    expect(source).toContain('onBack');
    expect(source).toContain('onContinue');
  });

  test('uses radio-button selection styling pattern', () => {
    expect(source).toContain('bg-primary/10');
    expect(source).toContain('border-primary/40');
  });

  test('renders TextArea only when "other" is selected', () => {
    expect(source).toContain('isOtherReason');
    expect(source).toContain('TextArea');
  });

  test('disables Continue when no reason chosen or empty other text', () => {
    expect(source).toContain('disabled');
  });

  test('renders a back button', () => {
    expect(source).toContain('onBack');
    expect(source).toMatch(/ArrowLeft|ChevronLeft/);
  });

  test('renders survey title', () => {
    expect(source).toContain('Before you go');
  });
});
