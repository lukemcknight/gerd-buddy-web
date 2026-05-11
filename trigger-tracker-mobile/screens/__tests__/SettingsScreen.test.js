describe('SettingsScreen', () => {
  let source;
  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(path.join(__dirname, '..', 'SettingsScreen.js'), 'utf-8');
  });

  describe('Imports', () => {
    it('imports Mascot component', () => {
      expect(source).toContain('import Mascot');
    });
  });

  describe('Profile header', () => {
    it('contains default username "Buddy"', () => {
      expect(source).toContain('"Buddy"');
    });

    it('uses Mascot component', () => {
      expect(source).toContain('<Mascot');
    });
  });

  describe('SettingsCard component', () => {
    it('defines SettingsCard component', () => {
      expect(source).toContain('SettingsCard');
    });

    it('has icon prop', () => {
      expect(source).toContain('icon');
    });

    it('has label prop', () => {
      expect(source).toContain('label');
    });

    it('has subtitle prop', () => {
      expect(source).toContain('subtitle');
    });
  });

  describe('Section headers', () => {
    it('has Notifications section header', () => {
      expect(source).toContain('>Notifications<');
    });

    it('has Account section header', () => {
      expect(source).toContain('>Account<');
    });

    it('has Help section header', () => {
      expect(source).toContain('>Help<');
    });

    it('has Legal section header', () => {
      expect(source).toContain('>Legal<');
    });

    it('has Data section header', () => {
      expect(source).toContain('>Data<');
    });

    it('uses bold font for section headers', () => {
      expect(source).toContain('font-bold');
    });
  });

  describe('Notifications section', () => {
    it('contains Daily Reminders', () => {
      expect(source).toContain('Daily Reminders');
    });

    it('contains Evening Reminder', () => {
      expect(source).toContain('Evening Reminder');
    });

    it('contains notification permission warning', () => {
      expect(source).toContain('Notifications are off');
    });
  });

  describe('Help section', () => {
    it('contains How It Works', () => {
      expect(source).toContain('How It Works');
    });

    it('contains About the Developer', () => {
      expect(source).toContain('About the Developer');
    });

    it('contains Send Feedback', () => {
      expect(source).toContain('Send Feedback');
    });
  });

  describe('Subscription section', () => {
    it('contains Manage Subscription', () => {
      expect(source).toContain('Manage Subscription');
    });

    it('contains Cancel Subscription entry that navigates to CancelSubscription', () => {
      expect(source).toContain('Cancel Subscription');
      expect(source).toContain('navigate("CancelSubscription")');
    });

    it('gates Cancel Subscription on isPro state', () => {
      expect(source).toContain('isPro');
      const cancelIdx = source.indexOf('Cancel Subscription');
      const before = source.slice(Math.max(0, cancelIdx - 200), cancelIdx);
      expect(before).toMatch(/isPro\s*&&/);
    });

    it('marks Cancel Subscription as destructive', () => {
      const cancelIdx = source.indexOf('Cancel Subscription');
      const slice = source.slice(cancelIdx, cancelIdx + 400);
      expect(slice).toContain('destructive');
    });
  });

  describe('Data section', () => {
    it('contains Clear All Data', () => {
      expect(source).toContain('Clear All Data');
    });

    it('contains Start Over', () => {
      expect(source).toContain('Start Over');
    });
  });

  describe('Medical disclaimer', () => {
    it('contains medical disclaimer text', () => {
      expect(source).toContain('This app is not medical advice');
    });
  });

  describe('Version', () => {
    it('contains version string', () => {
      expect(source).toContain('GERDBuddy v');
    });
  });
});
