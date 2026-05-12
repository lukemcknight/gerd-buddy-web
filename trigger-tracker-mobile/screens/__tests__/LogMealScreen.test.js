const fs = require('fs');
const path = require('path');

describe('LogMealScreen redesign', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'LogMealScreen.js'),
      'utf-8'
    );
  });

  test('uses the new shared log primitives', () => {
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/LogScreenShell['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/ChipScroller['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/TimeEntry['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/MealLibrarySheet['"]/);
    expect(source).toMatch(/from ['"]\.\.\/components\/log\/SubmitFeedback['"]/);
  });

  test('no longer imports native DateTimePicker', () => {
    expect(source).not.toContain('@react-native-community/datetimepicker');
  });

  test('uses buddy variant on submit', () => {
    expect(source).toMatch(/variant\s*=\s*['"]buddy['"]/);
  });

  test('pulls recent meal suggestions from storage', () => {
    expect(source).toContain('getRecentMealSuggestions');
  });

  test('fires meal_logged with source field', () => {
    expect(source).toContain('meal_logged');
    expect(source).toContain('source');
  });

  test('still preserves streak side-effects', () => {
    expect(source).toContain('getStreakInfo');
    expect(source).toContain('STREAK_MILESTONES');
    expect(source).toContain('updateBestStreak');
  });
});
