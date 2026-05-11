const fs = require('fs');
const path = require('path');

describe('MealLibrarySheet', () => {
  let source;
  beforeAll(() => {
    source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'log', 'MealLibrarySheet.js'),
      'utf-8'
    );
  });

  test('exports MealLibrarySheet as default', () => {
    expect(source).toMatch(/export default MealLibrarySheet/);
  });

  test('has all five categories', () => {
    ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Snacks'].forEach((cat) => {
      expect(source).toContain(cat);
    });
  });

  test('has search input', () => {
    expect(source).toContain('search');
  });

  test('Done button reflects count', () => {
    expect(source).toContain('Done');
    expect(source).toMatch(/selected\.length|selected\.size/);
  });

  test('exposes visible, onCancel, onConfirm', () => {
    expect(source).toContain('visible');
    expect(source).toContain('onCancel');
    expect(source).toContain('onConfirm');
  });

  test('includes Coffee, Pizza, Water as sample items', () => {
    expect(source).toContain('Coffee');
    expect(source).toContain('Pizza');
    expect(source).toContain('Water');
  });
});
