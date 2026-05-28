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
      { step: 1, label: 'Age' },
      { step: 2, label: 'Gender' },
      { step: 3, label: 'Height & Weight' },
      { step: 4, label: 'Reflux Duration' },
      { step: 5, label: 'Severity' },
      { step: 6, label: 'Health Stats Interstitial' },
      { step: 7, label: 'Symptom Frequency' },
      { step: 8, label: 'Top Symptoms' },
      { step: 9, label: 'Value Prop Interstitial' },
      { step: 10, label: 'Fear Foods' },
      { step: 11, label: 'Meal Times + Meds' },
      { step: 12, label: 'Rate Us' },
      { step: 13, label: 'Goal' },
      { step: 14, label: 'Reminders' },
    ];

    steps.forEach(({ step, label }) => {
      it(`contains a comment for Step ${step}: ${label}`, () => {
        expect(source).toContain(`Step ${step}: ${label}`);
      });
    });

    it('removed the lying-down step', () => {
      expect(source).not.toContain('Are symptoms worse when lying down?');
      expect(source).not.toMatch(/worseLyingDown/);
    });

    it('removed the symptom-timing step', () => {
      expect(source).not.toContain('When do you usually experience symptoms?');
      expect(source).not.toMatch(/symptomTimingOptions/);
    });

    it('removed the after-eating step', () => {
      expect(source).not.toContain('Do symptoms usually happen after eating?');
      expect(source).not.toMatch(/afterEatingOptions/);
    });

    it('contains the new age headline', () => {
      expect(source).toContain('How old are you?');
    });

    it('contains the new height & weight headline', () => {
      expect(source).toContain('Height & Weight');
    });

    it('contains the new reflux-duration headline', () => {
      expect(source).toContain('How long have you struggled with reflux/GERD?');
    });

    it('contains the new gender headline', () => {
      expect(source).toContain("What's your gender?");
    });
  });

  describe('Rating step UI', () => {
    it('contains "Enjoying GERDBuddy?" heading', () => {
      expect(source).toContain('Enjoying GERDBuddy?');
    });

    it('contains the rating subtitle', () => {
      expect(source).toContain('Your feedback helps others find relief too');
    });

    it('renders five Lucide Star icons instead of unicode glyphs', () => {
      expect(source).toContain('<Star');
      expect(source).not.toContain('⭐⭐⭐⭐⭐');
    });
  });

  describe('Rating step calls StoreReview', () => {
    it('calls StoreReview.requestReview() on step 13 mount', () => {
      expect(source).toContain('StoreReview.requestReview()');
    });
  });

  describe('Rating step Continue dwell', () => {
    it('declares the canContinueRating gate', () => {
      expect(source).toContain('canContinueRating');
    });

    it('enables the gate after a 4 second timer', () => {
      expect(source).toMatch(/setTimeout\(\(\) => setCanContinueRating\(true\), 4000\)/);
    });
  });

  describe('Rating analytics', () => {
    it('captures onboarding_rating_prompted on mount', () => {
      expect(source).toContain('onboarding_rating_prompted');
    });

    it('captures onboarding_rating_continued when user advances', () => {
      expect(source).toContain('onboarding_rating_continued');
    });
  });

  describe('Step progression', () => {
    it('Step 12 (Rate Us) advances to step 13 (setStep(13))', () => {
      expect(source).toContain('setStep(13)');
    });

    it('Step 13 (Goal) advances to step 14 (setStep(14))', () => {
      expect(source).toContain('setStep(14)');
    });
  });

  describe('Goal step', () => {
    it('contains the "What is your goal?" headline', () => {
      expect(source).toContain('What is your goal?');
    });

    const goalLabels = [
      'Identify my trigger foods',
      'Reduce daily symptoms',
      'Sleep without heartburn',
      'Eat without fear',
      'Stop relying on medication',
    ];

    goalLabels.forEach((label) => {
      it(`offers the goal option: ${label}`, () => {
        expect(source).toContain(label);
      });
    });

    it('captures onboarding_goal_set on continue', () => {
      expect(source).toContain('onboarding_goal_set');
    });
  });

  describe('Removed content', () => {
    it('no longer renders the educational-purposes disclaimer', () => {
      expect(source).not.toContain('Educational purposes only');
    });

    it('no longer renders the "What are you dealing with?" step', () => {
      expect(source).not.toContain('What are you dealing with?');
    });

    it('no longer renders the bottom GERDBuddy blurb on the health-stats step', () => {
      expect(source).not.toContain('GERDBuddy helps you identify your unique triggers');
    });
  });

  describe('Reminders step', () => {
    it('step 14 contains "Enable reminders?"', () => {
      expect(source).toContain('Enable reminders?');
    });

    it('step 14 calls handleComplete', () => {
      expect(source).toContain('handleComplete');
    });
  });

  describe('SignUp step removed', () => {
    it('does not import SignUpScreen', () => {
      expect(source).not.toContain('import SignUpScreen');
    });

    it('does not import useAuth', () => {
      expect(source).not.toContain("from \"../contexts/AuthContext\"");
    });

    it('does not render SignUpScreen', () => {
      expect(source).not.toContain('<SignUpScreen');
    });
  });
});
