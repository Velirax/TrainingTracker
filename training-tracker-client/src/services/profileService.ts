import { apiFetch } from './apiClient';

export interface Preferences {
  distanceUnit: 'km' | 'mi';
  weekStartsOn: number;
  defaultCalendarView: 'week' | 'month';
  weightKg: number | null;
  weeklyTrainingMinutesGoal: number | null;
  dailyStepsGoal: number | null;
  streakGoalDays: number | null;
  lastStepsImportAt: string | null;
}

export async function getPreferences(): Promise<Preferences> {
  const response = await apiFetch('http://localhost:5205/api/profile/preferences');
  if (!response.ok) throw new Error('Could not load preferences.');
  return response.json() as Promise<Preferences>;
}

export async function updatePreferences(preferences: Preferences): Promise<Preferences> {
  const response = await apiFetch('http://localhost:5205/api/profile/preferences', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(preferences),
  });
  if (!response.ok) throw new Error('Could not save preferences.');
  return response.json() as Promise<Preferences>;
}
