/**
 * Tests for resolvePremiumStatus (the pure logic behind usePremiumStatus)
 *
 * Key behavior:
 * - RC active → isPro=true, syncs local flag up if disagrees
 * - RC inactive (production) → isPro=false, clears stale local flag
 * - RC inactive (__DEV__) → falls back to local flag (screenshot/demo mode)
 * - RC error → falls back to local flag (offline tolerance)
 */

const mockGetUser = jest.fn();
const mockSaveUser = jest.fn();
const mockGetSubscriptionStatus = jest.fn();

jest.mock('../../services/storage', () => ({
  getUser: mockGetUser,
  saveUser: mockSaveUser,
}));

jest.mock('../../services/revenuecat', () => ({
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

const { resolvePremiumStatus } = require('../usePremiumStatus');

beforeEach(() => {
  jest.clearAllMocks();
  mockSaveUser.mockResolvedValue(undefined);
  global.__DEV__ = false;
});

describe('resolvePremiumStatus', () => {
  test('returns isPro=true when RC reports active', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: false });
    mockGetSubscriptionStatus.mockResolvedValue({ active: true });

    const isPro = await resolvePremiumStatus('u1');
    expect(isPro).toBe(true);
  });

  test('syncs local flag UP when RC active but local disagrees', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: false });
    mockGetSubscriptionStatus.mockResolvedValue({ active: true });

    await resolvePremiumStatus('u1');
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionActive: true })
    );
  });

  test('does not write when RC active matches local flag', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true });
    mockGetSubscriptionStatus.mockResolvedValue({ active: true });

    await resolvePremiumStatus('u1');
    expect(mockSaveUser).not.toHaveBeenCalled();
  });

  test('returns isPro=false when RC reports inactive (production)', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true });
    mockGetSubscriptionStatus.mockResolvedValue({ active: false });

    const isPro = await resolvePremiumStatus('u1');
    expect(isPro).toBe(false);
  });

  test('clears stale local flag when RC reports inactive (production)', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true });
    mockGetSubscriptionStatus.mockResolvedValue({ active: false });

    await resolvePremiumStatus('u1');
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionActive: false })
    );
  });

  test('does not write when RC inactive matches local flag (production)', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: false });
    mockGetSubscriptionStatus.mockResolvedValue({ active: false });

    const isPro = await resolvePremiumStatus('u1');
    expect(isPro).toBe(false);
    expect(mockSaveUser).not.toHaveBeenCalled();
  });

  test('falls back to local flag when RC inactive in __DEV__ (screenshot mode)', async () => {
    global.__DEV__ = true;
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true });
    mockGetSubscriptionStatus.mockResolvedValue({ active: false });

    const isPro = await resolvePremiumStatus('u1');
    expect(isPro).toBe(true);
    expect(mockSaveUser).not.toHaveBeenCalled();
  });

  test('falls back to local flag when RC errors (offline tolerance)', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true });
    mockGetSubscriptionStatus.mockRejectedValue(new Error('offline'));

    const isPro = await resolvePremiumStatus('u1');
    expect(isPro).toBe(true);
  });

  test('returns isPro=false when RC errors and no local flag', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: false });
    mockGetSubscriptionStatus.mockRejectedValue(new Error('offline'));

    const isPro = await resolvePremiumStatus('u1');
    expect(isPro).toBe(false);
  });
});
