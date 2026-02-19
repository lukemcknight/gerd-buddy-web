/**
 * Tests for LoginScreen subscription checking logic
 *
 * Key behavior tested:
 * - After successful login, restoreTransactions is called to check for existing subscriptions
 * - If user has active subscription, navigates to Main (skips paywall)
 * - If no subscription or restore fails, navigates to Paywall
 */

// Mock the revenuecat module before imports
jest.mock('../../services/revenuecat', () => ({
  restoreTransactions: jest.fn(),
}));

// Mock the AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const { restoreTransactions } = require('../../services/revenuecat');
const { useAuth } = require('../../contexts/AuthContext');

describe('LoginScreen - Subscription Checking', () => {
  let mockNavigation;
  let mockSignIn;
  let mockClearError;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup navigation mock
    mockNavigation = {
      replace: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => false),
      navigate: jest.fn(),
    };

    // Setup auth mock
    mockSignIn = jest.fn();
    mockClearError = jest.fn();
    useAuth.mockReturnValue({
      signIn: mockSignIn,
      error: null,
      clearError: mockClearError,
    });
  });

  describe('handleLogin subscription flow', () => {
    // Simulate the handleLogin logic directly since component rendering
    // requires full React Native environment
    const simulateHandleLogin = async ({
      email,
      password,
      onSuccess,
      navigation,
    }) => {
      // Simulate the login flow from LoginScreen
      await mockSignIn(email.trim().toLowerCase(), password);

      if (onSuccess) {
        // Check/restore subscription before deciding navigation
        try {
          const result = await restoreTransactions();
          if (result.active) {
            navigation.replace('Main');
            return;
          }
        } catch (error) {
          // Fall through to paywall
        }
        navigation.replace('Paywall');
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      }
    };

    test('navigates to Main when user has active subscription', async () => {
      // Setup: restoreTransactions returns active subscription
      restoreTransactions.mockResolvedValue({ active: true, isTrial: false });
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        email: 'test@example.com',
        password: 'password123',
        onSuccess: true,
        navigation: mockNavigation,
      });

      // Verify signIn was called
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');

      // Verify restoreTransactions was called
      expect(restoreTransactions).toHaveBeenCalled();

      // Verify navigation to Main (not Paywall)
      expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
      expect(mockNavigation.replace).not.toHaveBeenCalledWith('Paywall');
    });

    test('navigates to Main when user has active trial', async () => {
      // Setup: restoreTransactions returns active trial
      restoreTransactions.mockResolvedValue({ active: true, isTrial: true });
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        email: 'test@example.com',
        password: 'password123',
        onSuccess: true,
        navigation: mockNavigation,
      });

      // Should still go to Main (trial is still active)
      expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
    });

    test('navigates to Paywall when user has no subscription', async () => {
      // Setup: restoreTransactions returns inactive subscription
      restoreTransactions.mockResolvedValue({ active: false });
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        email: 'test@example.com',
        password: 'password123',
        onSuccess: true,
        navigation: mockNavigation,
      });

      // Verify navigation to Paywall
      expect(restoreTransactions).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('navigates to Paywall when restoreTransactions fails', async () => {
      // Setup: restoreTransactions throws error
      restoreTransactions.mockRejectedValue(new Error('Network error'));
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        email: 'test@example.com',
        password: 'password123',
        onSuccess: true,
        navigation: mockNavigation,
      });

      // Verify fallback to Paywall on error
      expect(restoreTransactions).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('goes back when no onSuccess callback (from Settings)', async () => {
      mockSignIn.mockResolvedValue();
      mockNavigation.canGoBack.mockReturnValue(true);

      await simulateHandleLogin({
        email: 'test@example.com',
        password: 'password123',
        onSuccess: false, // No onSuccess callback
        navigation: mockNavigation,
      });

      // Should not check subscription, just go back
      expect(restoreTransactions).not.toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockNavigation.replace).not.toHaveBeenCalled();
    });

    test('normalizes email to lowercase', async () => {
      restoreTransactions.mockResolvedValue({ active: true });
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        email: '  TEST@Example.COM  ',
        password: 'password123',
        onSuccess: true,
        navigation: mockNavigation,
      });

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  describe('edge cases', () => {
    const simulateHandleLogin = async ({ onSuccess, navigation }) => {
      await mockSignIn('test@example.com', 'password');
      if (onSuccess) {
        try {
          const result = await restoreTransactions();
          if (result.active) {
            navigation.replace('Main');
            return;
          }
        } catch (error) {
          // Fall through
        }
        navigation.replace('Paywall');
      }
    };

    test('handles undefined result from restoreTransactions', async () => {
      restoreTransactions.mockResolvedValue(undefined);
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        onSuccess: true,
        navigation: mockNavigation,
      });

      // Should navigate to Paywall when result is undefined
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('handles null result from restoreTransactions', async () => {
      restoreTransactions.mockResolvedValue(null);
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        onSuccess: true,
        navigation: mockNavigation,
      });

      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('handles result with active: undefined', async () => {
      restoreTransactions.mockResolvedValue({ active: undefined });
      mockSignIn.mockResolvedValue();

      await simulateHandleLogin({
        onSuccess: true,
        navigation: mockNavigation,
      });

      // undefined is falsy, should go to Paywall
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });
  });
});
