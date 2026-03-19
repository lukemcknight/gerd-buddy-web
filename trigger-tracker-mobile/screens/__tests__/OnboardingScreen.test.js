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
    it('defines totalSteps = 12', () => {
      expect(source).toContain('totalSteps = 12');
    });
  });

  describe('Step ordering', () => {
    const steps = [
      { step: 0, label: 'Welcome' },
      { step: 1, label: 'Condition Selection' },
      { step: 2, label: 'Symptom Severity' },
      { step: 3, label: 'Symptom Timing' },
      { step: 4, label: 'Frequency' },
      { step: 5, label: 'Top Symptoms' },
      { step: 6, label: 'After Eating' },
      { step: 7, label: 'Lying Down' },
      { step: 8, label: 'Fear Foods' },
      { step: 9, label: 'Meal Times + Meds' },
      { step: 10, label: 'Rate Us' },
      { step: 11, label: 'Reminders' },
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
    it('Step 9 advances to step 10 (setStep(10) after mealTimes)', () => {
      expect(source).toContain('setStep(10)');
    });

    it('Step 10 advances to step 11 (setStep(11))', () => {
      expect(source).toContain('setStep(11)');
    });
  });

  describe('Reminders step', () => {
    it('step 11 contains "Enable reminders?"', () => {
      expect(source).toContain('Enable reminders?');
    });

    it('step 11 calls handleComplete', () => {
      expect(source).toContain('handleComplete');
    });
  });
});
