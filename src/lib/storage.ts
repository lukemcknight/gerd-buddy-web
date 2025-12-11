import { Meal, Symptom, UserProfile } from '@/types';

const STORAGE_KEYS = {
  MEALS: 'acidtrack_meals',
  SYMPTOMS: 'acidtrack_symptoms',
  USER: 'acidtrack_user',
} as const;

// Generate unique ID
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Meals
export const getMeals = (): Meal[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MEALS);
  return data ? JSON.parse(data) : [];
};

export const saveMeal = (meal: Omit<Meal, 'id' | 'createdAt'>): Meal => {
  const meals = getMeals();
  const newMeal: Meal = {
    ...meal,
    id: generateId(),
    createdAt: Date.now(),
  };
  meals.push(newMeal);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
  return newMeal;
};

export const deleteMeal = (id: string): void => {
  const meals = getMeals().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
};

// Symptoms
export const getSymptoms = (): Symptom[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SYMPTOMS);
  return data ? JSON.parse(data) : [];
};

export const saveSymptom = (symptom: Omit<Symptom, 'id' | 'createdAt'>): Symptom => {
  const symptoms = getSymptoms();
  const newSymptom: Symptom = {
    ...symptom,
    id: generateId(),
    createdAt: Date.now(),
  };
  symptoms.push(newSymptom);
  localStorage.setItem(STORAGE_KEYS.SYMPTOMS, JSON.stringify(symptoms));
  return newSymptom;
};

export const deleteSymptom = (id: string): void => {
  const symptoms = getSymptoms().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SYMPTOMS, JSON.stringify(symptoms));
};

// User Profile
export const getUser = (): UserProfile | null => {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
};

export const saveUser = (user: UserProfile): void => {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const createUser = (symptoms: string[], remindersEnabled: boolean): UserProfile => {
  const user: UserProfile = {
    id: generateId(),
    onboardingComplete: true,
    symptoms,
    remindersEnabled,
    createdAt: Date.now(),
    startDate: Date.now(),
  };
  saveUser(user);
  return user;
};

// Get days since start
export const getDaysSinceStart = (): number => {
  const user = getUser();
  if (!user) return 0;
  const diff = Date.now() - user.startDate;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Clear all data
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.MEALS);
  localStorage.removeItem(STORAGE_KEYS.SYMPTOMS);
  localStorage.removeItem(STORAGE_KEYS.USER);
};
