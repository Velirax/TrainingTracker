import type { DailySteps } from '../types/dailySteps';
import { apiFetch } from './apiClient';

const apiBaseUrl = 'http://localhost:5205/api';

export async function getSteps(startDate: string, endDate: string): Promise<DailySteps[]> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await apiFetch(`${apiBaseUrl}/steps?${query.toString()}`);

  if (!response.ok) {
    throw new Error('Could not load step data.');
  }

  return response.json() as Promise<DailySteps[]>;
}
