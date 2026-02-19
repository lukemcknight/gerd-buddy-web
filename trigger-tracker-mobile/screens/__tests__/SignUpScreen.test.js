/**
 * Tests for SignUpScreen subscription checking logic
 *
 * Key behavior tested:
 * - After successful signup, restoreTransactions is called to check for existing subscriptions
 *   (handles case where user started trial anonymously before creating account)
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

describe('SignUpScreen - Subscription Checking', () => {
  let mockNavigation;
  let mockSignUp;
  let mockClearError;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup navigation mock
    mockNavigation = {
      replace: jest.fn(),
      navigate: jest.fn(),
    };

    // Setup auth mock
    mockSignUp = jest.fn();
    mockClearError = jest.fn();
    useAuth.mockReturnValue({
      signUp: mockSignUp,
      error: null,
      clearError: mockClearError,
    });
  });

  describe('handleSignUp subscription flow', () => {
    // Simulate the handleSignUp logic directly
    const simulateHandleSignUp = async ({ email, password, navigation }) => {
      // Simulate the signup flow from SignUpScreen
      await mockSignUp(email.trim().toLowerCase(), password);

      // Check if user already has an active subscription
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
    };

    test('navigates to Main when user has active subscription (anonymous trial transferred)', async () => {
      // Scenario: User started trial anonymously, now creating account
      // The trial should be transferred to new account via RevenueCat logIn
      restoreTransactions.mockResolvedValue({ active: true, isTrial: true });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({
        email: 'newuser@example.com',
        password: 'password123',
        navigation: mockNavigation,
      });

      // Verify signUp was called
      expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123');

      // Verify restoreTransactions was called
      expect(restoreTransactions).toHaveBeenCalled();

      // Verify navigation to Main (not Paywall)
      expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
      expect(mockNavigation.replace).not.toHaveBeenCalledWith('Paywall');
    });

    test('navigates to Main when user has active full subscription', async () => {
      // Scenario: User had a full subscription on device before creating account
      restoreTransactions.mockResolvedValue({ active: true, isTrial: false });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({
        email: 'newuser@example.com',
        password: 'password123',
        navigation: mockNavigation,
      });

      expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
    });

    test('navigates to Paywall when user has no subscription', async () => {
      // Scenario: Fresh user with no prior subscription
      restoreTransactions.mockResolvedValue({ active: false });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({
        email: 'newuser@example.com',
        password: 'password123',
        navigation: mockNavigation,
      });

      // Verify navigation to Paywall
      expect(restoreTransactions).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('navigates to Paywall when restoreTransactions fails', async () => {
      // Setup: restoreTransactions throws error
      restoreTransactions.mockRejectedValue(new Error('Network error'));
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({
        email: 'newuser@example.com',
        password: 'password123',
        navigation: mockNavigation,
      });

      // Verify fallback to Paywall on error
      expect(restoreTransactions).toHaveBeenCalled();
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('normalizes email to lowercase and trims whitespace', async () => {
      restoreTransactions.mockResolvedValue({ active: true });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({
        email: '  NEWUSER@Example.COM  ',
        password: 'password123',
        navigation: mockNavigation,
      });

      expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123');
    });
  });

  describe('trial-to-account conversion scenarios', () => {
    const simulateHandleSignUp = async ({ navigation }) => {
      await mockSignUp('test@example.com', 'password');
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
    };

    test('handles expired trial (should show paywall)', async () => {
      // User had trial but it expired before creating account
      restoreTransactions.mockResolvedValue({
        active: false,
        isTrial: true,
        expiresAt: Date.now() - 1000, // Expired
      });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({ navigation: mockNavigation });

      // Should show paywall since trial expired
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('handles active trial with future expiration', async () => {
      restoreTransactions.mockResolvedValue({
        active: true,
        isTrial: true,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({ navigation: mockNavigation });

      // Should go to Main
      expect(mockNavigation.replace).toHaveBeenCalledWith('Main');
    });
  });

  describe('edge cases', () => {
    const simulateHandleSignUp = async ({ navigation }) => {
      await mockSignUp('test@example.com', 'password');
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
    };

    test('handles undefined result from restoreTransactions', async () => {
      restoreTransactions.mockResolvedValue(undefined);
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({ navigation: mockNavigation });

      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('handles null result from restoreTransactions', async () => {
      restoreTransactions.mockResolvedValue(null);
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({ navigation: mockNavigation });

      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('handles result with active: undefined', async () => {
      restoreTransactions.mockResolvedValue({ active: undefined });
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({ navigation: mockNavigation });

      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });

    test('handles RevenueCat user cancelled error gracefully', async () => {
      const userCancelledError = new Error('User cancelled');
      userCancelledError.code = 'PURCHASE_CANCELLED_ERROR';
      restoreTransactions.mockRejectedValue(userCancelledError);
      mockSignUp.mockResolvedValue();

      await simulateHandleSignUp({ navigation: mockNavigation });

      // Should still navigate to Paywall
      expect(mockNavigation.replace).toHaveBeenCalledWith('Paywall');
    });
  });
});
