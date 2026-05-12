jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: class PostHogStub {},
}));

const { EVENTS } = require('../analytics');

describe('Cancel-flow analytics event names', () => {
  test('all seven events exist with stable string values', () => {
    expect(EVENTS.CANCEL_FLOW_STARTED).toBe('cancel_flow_started');
    expect(EVENTS.CANCEL_REASON_SELECTED).toBe('cancel_reason_selected');
    expect(EVENTS.RETENTION_OFFER_SHOWN).toBe('retention_offer_shown');
    expect(EVENTS.RETENTION_OFFER_ACCEPTED).toBe('retention_offer_accepted');
    expect(EVENTS.RETENTION_OFFER_DECLINED).toBe('retention_offer_declined');
    expect(EVENTS.CANCEL_FLOW_DISMISSED).toBe('cancel_flow_dismissed');
    expect(EVENTS.CANCEL_FLOW_COMPLETED).toBe('cancel_flow_completed');
  });
});
