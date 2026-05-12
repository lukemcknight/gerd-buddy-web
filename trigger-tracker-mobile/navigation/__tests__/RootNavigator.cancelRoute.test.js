const fs = require('fs');
const path = require('path');

describe('RootNavigator — CancelSubscription route', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', 'RootNavigator.js'),
      'utf-8'
    );
  });

  test('imports CancelSubscriptionScreen', () => {
    expect(source).toContain('import CancelSubscriptionScreen');
    expect(source).toMatch(/from ['"]\.\.\/screens\/CancelSubscriptionScreen['"]/);
  });

  test('registers CancelSubscription Stack.Screen', () => {
    expect(source).toMatch(
      /<Stack\.Screen\s+name="CancelSubscription"\s+component=\{CancelSubscriptionScreen\}\s*\/>/
    );
  });
});
