import type { TrainingSession } from '../types/trainingSession';

const apiBaseUrl = 'http://localhost:5205/api';

export async function getTrainingSessions(
  startDate: string,
  endDate: string,
): Promise<TrainingSession[]> {
  const query = new URLSearchParams({
    startDate,
    endDate,
  });

  const response = await fetch(
    `${apiBaseUrl}/training-sessions?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error('Could not load training sessions.');
  }

  return response.json() as Promise<TrainingSession[]>;
}