/**
 * Tests for scannerGate freemium gating logic
 *
 * Key behavior tested:
 * - Free user at 0, 1, 2 scans → allowed (free_under_limit)
 * - Free user at 3 scans → blocked (limit_reached)
 * - Pro user at any count → allowed (pro)
 * - Feature flag off → blocked (flag_off_pro_only)
 * - No user → blocked (no_user)
 * - incrementFreeScanCount: increments correctly, dedup guard works
 * - getRemainingFreeScans: returns correct count
 */

const mockGetUser = jest.fn();
const mockSaveUser = jest.fn();
const mockConfigureRevenueCat = jest.fn();
const mockGetSubscriptionStatus = jest.fn();

jest.mock('../storage', () => ({
  getUser: mockGetUser,
  saveUser: mockSaveUser,
}));

jest.mock('../revenuecat', () => ({
  configureRevenueCat: mockConfigureRevenueCat,
  getSubscriptionStatus: mockGetSubscriptionStatus,
}));

const {
  canUserScan,
  incrementFreeScanCount,
  getRemainingFreeScans,
  FREE_SCAN_LIMIT,
  FEATURE_FLAGS,
} = require('../scannerGate');

beforeEach(() => {
  jest.clearAllMocks();

  // Default: feature flag on
  FEATURE_FLAGS.freemium_scanner_limit_v1 = true;
  mockConfigureRevenueCat.mockResolvedValue(undefined);
  mockGetSubscriptionStatus.mockResolvedValue({ active: false });
  mockSaveUser.mockResolvedValue(undefined);
});

describe('canUserScan', () => {
  test('returns no_user when no user exists', async () => {
    mockGetUser.mockResolvedValue(null);
    const result = await canUserScan();
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('no_user');
  });

  test('allows free user with 0 scans', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 0 });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('free_under_limit');
    expect(result.freeScanCount).toBe(0);
  });

  test('allows free user with 1 scan', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 1 });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('free_under_limit');
    expect(result.freeScanCount).toBe(1);
  });

  test('allows free user with 2 scans', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 2 });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('free_under_limit');
    expect(result.freeScanCount).toBe(2);
  });

  test('blocks free user at limit (3 scans)', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 3 });
    const result = await canUserScan();
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('limit_reached');
    expect(result.entitlementState).toBe('free');
    expect(result.freeScanCount).toBe(3);
    expect(result.freeScanLimit).toBe(FREE_SCAN_LIMIT);
  });

  test('blocks free user above limit (5 scans)', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 5 });
    const result = await canUserScan();
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('limit_reached');
  });

  test('allows Pro user regardless of scan count', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true, freeScanCount: 10 });
    mockGetSubscriptionStatus.mockResolvedValue({ active: true });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('pro');
    expect(result.entitlementState).toBe('pro');
  });

  test('allows Pro user with 0 scans', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true, freeScanCount: 0 });
    mockGetSubscriptionStatus.mockResolvedValue({ active: true });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('pro');
  });

  test('falls back to local subscriptionActive on RevenueCat error', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: true, freeScanCount: 5 });
    mockConfigureRevenueCat.mockRejectedValue(new Error('offline'));
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('pro');
  });

  test('persists subscription if RevenueCat says active but local disagrees', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', subscriptionActive: false, freeScanCount: 5 });
    mockGetSubscriptionStatus.mockResolvedValue({ active: true });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('pro');
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionActive: true })
    );
  });

  test('returns flag_off_pro_only when feature flag is off', async () => {
    FEATURE_FLAGS.freemium_scanner_limit_v1 = false;
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 0 });
    const result = await canUserScan();
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('flag_off_pro_only');
  });

  test('falls back to scanCount when freeScanCount is undefined', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', scanCount: 2 });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.freeScanCount).toBe(2);
  });

  test('defaults to 0 when both freeScanCount and scanCount are undefined', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1' });
    const result = await canUserScan();
    expect(result.allowed).toBe(true);
    expect(result.freeScanCount).toBe(0);
  });
});

describe('incrementFreeScanCount', () => {
  test('increments from 0 to 1', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 0 });
    const newCount = await incrementFreeScanCount();
    expect(newCount).toBe(1);
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ freeScanCount: 1, scanCount: 1 })
    );
  });

  test('increments from 2 to 3', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 2 });
    const newCount = await incrementFreeScanCount();
    expect(newCount).toBe(3);
  });

  test('returns -1 when no user exists', async () => {
    mockGetUser.mockResolvedValue(null);
    const newCount = await incrementFreeScanCount();
    expect(newCount).toBe(-1);
    expect(mockSaveUser).not.toHaveBeenCalled();
  });

  test('dedup guard: skips increment if scanId matches _lastScanId', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 2, _lastScanId: 'scan_abc' });
    const newCount = await incrementFreeScanCount('scan_abc');
    expect(newCount).toBe(2);
    expect(mockSaveUser).not.toHaveBeenCalled();
  });

  test('increments when scanId is different from _lastScanId', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 2, _lastScanId: 'scan_abc' });
    const newCount = await incrementFreeScanCount('scan_xyz');
    expect(newCount).toBe(3);
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ freeScanCount: 3, _lastScanId: 'scan_xyz' })
    );
  });

  test('stores lastScanDate timestamp', async () => {
    const before = Date.now();
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 0 });
    await incrementFreeScanCount('scan_1');
    const savedUser = mockSaveUser.mock.calls[0][0];
    expect(savedUser.lastScanDate).toBeGreaterThanOrEqual(before);
    expect(savedUser.lastScanDate).toBeLessThanOrEqual(Date.now());
  });

  test('falls back to scanCount when freeScanCount is undefined', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', scanCount: 1 });
    const newCount = await incrementFreeScanCount();
    expect(newCount).toBe(2);
    expect(mockSaveUser).toHaveBeenCalledWith(
      expect.objectContaining({ freeScanCount: 2, scanCount: 2 })
    );
  });
});

describe('getRemainingFreeScans', () => {
  test('returns FREE_SCAN_LIMIT when no user', async () => {
    mockGetUser.mockResolvedValue(null);
    const remaining = await getRemainingFreeScans();
    expect(remaining).toBe(FREE_SCAN_LIMIT);
  });

  test('returns 3 when user has 0 scans', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 0 });
    const remaining = await getRemainingFreeScans();
    expect(remaining).toBe(3);
  });

  test('returns 1 when user has 2 scans', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 2 });
    const remaining = await getRemainingFreeScans();
    expect(remaining).toBe(1);
  });

  test('returns 0 when user has reached limit', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 3 });
    const remaining = await getRemainingFreeScans();
    expect(remaining).toBe(0);
  });

  test('returns 0 when user exceeds limit', async () => {
    mockGetUser.mockResolvedValue({ id: 'u1', freeScanCount: 5 });
    const remaining = await getRemainingFreeScans();
    expect(remaining).toBe(0);
  });
});

describe('FREE_SCAN_LIMIT', () => {
  test('is set to 3', () => {
    expect(FREE_SCAN_LIMIT).toBe(3);
  });
});
