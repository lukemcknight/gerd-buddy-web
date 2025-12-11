export interface Meal {
  id: string;
  text: string;
  timestamp: number;
  createdAt: number;
}

export interface Symptom {
  id: string;
  severity: number; // 0-5
  timestamp: number;
  notes?: string;
  createdAt: number;
}

export interface TriggerScore {
  ingredient: string;
  score: number;
  occurrences: number;
  avgSeverity: number;
}

export interface TimePattern {
  hour: number;
  symptomCount: number;
  avgSeverity: number;
}

export interface DailyInsight {
  type: 'trigger' | 'time' | 'positive' | 'streak';
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface TriggerReport {
  topTriggers: TriggerScore[];
  lateEatingRisk: number;
  worstTimeOfDay: string;
  totalMeals: number;
  totalSymptoms: number;
  avgSeverity: number;
  symptomFreeDays: number;
  insights: DailyInsight[];
  generatedAt: number;
}

export interface UserProfile {
  id: string;
  onboardingComplete: boolean;
  symptoms: string[];
  remindersEnabled: boolean;
  createdAt: number;
  startDate: number;
}
