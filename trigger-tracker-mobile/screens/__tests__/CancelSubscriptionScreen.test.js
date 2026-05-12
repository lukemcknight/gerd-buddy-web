const fs = require('fs');
const path = require('path');

describe('CancelSubscriptionScreen', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'CancelSubscriptionScreen.js'),
      'utf-8'
    );
  });

  test('exports default function CancelSubscriptionScreen', () => {
    expect(source).toMatch(/export default function CancelSubscriptionScreen/);
  });

  test('imports the three step components', () => {
    expect(source).toContain('CancellationReasonStep');
    expect(source).toContain('RetentionOfferStep');
    expect(source).toContain('CancellationConfirmStep');
  });

  test('imports getSubscriptionStatus for managementURL', () => {
    expect(source).toContain('getSubscriptionStatus');
  });

  test('uses Linking.openURL for the App Store deep-link', () => {
    expect(source).toContain('Linking.openURL');
    expect(source).toContain('apps.apple.com/account/subscriptions');
  });

  test('uses usePostHog for analytics', () => {
    expect(source).toContain('usePostHog');
  });

  test('emits all required cancel-flow events', () => {
    expect(source).toContain('CANCEL_FLOW_STARTED');
    expect(source).toContain('CANCEL_REASON_SELECTED');
    expect(source).toContain('RETENTION_OFFER_SHOWN');
    expect(source).toContain('RETENTION_OFFER_ACCEPTED');
    expect(source).toContain('RETENTION_OFFER_DECLINED');
    expect(source).toContain('CANCEL_FLOW_COMPLETED');
  });

  test('tracks step state with three values', () => {
    expect(source).toMatch(/"reason"/);
    expect(source).toMatch(/"offer"/);
    expect(source).toMatch(/"confirm"/);
  });

  test('passes back/continue handlers down to step components', () => {
    expect(source).toContain('onBack');
    expect(source).toContain('onContinue');
    expect(source).toContain('onAccept');
    expect(source).toContain('onDecline');
  });

  test('reason survey runs BEFORE retention offer', () => {
    expect(source).toMatch(/useState\(\s*['"]reason['"]\s*\)/);
  });
});
