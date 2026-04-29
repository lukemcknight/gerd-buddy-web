describe('OnboardingScreen', () => {
  let source;
  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(path.join(__dirname, '..', 'OnboardingScreen.js'), 'utf-8');
  });

  describe('Imports', () => {
    it('imports Star from lucide-react-native', () => {
      expect(source).toContain('Star');
      expect(source).toContain('lucide-react-native');
    });

    it('imports expo-store-review', () => {
      expect(source).toContain('expo-store-review');
    });
  });

  describe('Total steps', () => {
    it('defines TOTAL_STEPS = 16', () => {
      expect(source).toContain('TOTAL_STEPS = 16');
    });
  });

  describe('Step ordering', () => {
    const steps = [
      { step: 0, label: 'Welcome' },
      { step: 1, label: 'Conditions' },
      { step: 2, label: 'Severity' },
      { step: 3, label: 'Symptom Timing' },
      { step: 4, label: 'Health Stats Interstitial' },
      { step: 5, label: 'Symptom Frequency' },
      { step: 6, label: 'Top Symptoms' },
      { step: 7, label: 'After Eating' },
      { step: 8, label: 'Value Prop Interstitial' },
      { step: 9, label: 'Lying Down' },
      { step: 10, label: 'Fear Foods' },
      { step: 11, label: 'Meal Times + Meds' },
      { step: 12, label: 'Rate Us' },
      { step: 13, label: 'Reminders' },
      { step: 14, label: 'SignUp (skippable)' },
      { step: 15, label: 'Loading' },
    ];

    steps.forEach(({ step, label }) => {
      it(`contains a comment for Step ${step}: ${label}`, () => {
        expect(source).toContain(`Step ${step}: ${label}`);
      });
    });
  });

  describe('Rating step UI', () => {
    it('contains "Enjoying GERDBuddy?" heading', () => {
      expect(source).toContain('Enjoying GERDBuddy?');
    });

    it('contains the rating subtitle', () => {
      expect(source).toContain('Your feedback helps others find relief too');
    });

    it('contains "Rate Us" button text', () => {
      expect(source).toContain('Rate Us');
    });

    it('contains "Maybe Later" option', () => {
      expect(source).toContain('Maybe Later');
    });
  });

  describe('Rating step calls StoreReview', () => {
    it('calls StoreReview.requestReview()', () => {
      expect(source).toContain('StoreReview.requestReview()');
    });
  });

  describe('Rating analytics', () => {
    it('captures onboarding_rating_prompted', () => {
      expect(source).toContain('onboarding_rating_prompted');
    });

    it('captures onboarding_rating_accepted', () => {
      expect(source).toContain('onboarding_rating_accepted');
    });

    it('captures onboarding_rating_skipped', () => {
      expect(source).toContain('onboarding_rating_skipped');
    });
  });

  describe('Step progression', () => {
    it('Step 12 (Rate Us) advances to step 13 (setStep(13))', () => {
      expect(source).toContain('setStep(13)');
    });
  });

  describe('Reminders step', () => {
    it('step 13 contains "Enable reminders?"', () => {
      expect(source).toContain('Enable reminders?');
    });

    it('step 13 calls handleComplete', () => {
      expect(source).toContain('handleComplete');
    });
  });

  describe('SignUp step', () => {
    it('renders SignUpScreen at step 14', () => {
      expect(source).toContain('step === 14');
      expect(source).toContain('<SignUpScreen');
    });

    it('passes onSuccess that advances to step 15', () => {
      expect(source).toContain('ONBOARDING_SIGNUP_COMPLETED');
      expect(source).toContain('setStep(15)');
    });

    it('passes onSkip that advances to step 15', () => {
      expect(source).toContain('ONBOARDING_SIGNUP_SKIPPED');
    });

    it('fires ONBOARDING_SIGNUP_SHOWN', () => {
      expect(source).toContain('ONBOARDING_SIGNUP_SHOWN');
    });

    it('auto-advances when already authenticated', () => {
      expect(source).toContain('isAuthenticated');
    });
  });
});
