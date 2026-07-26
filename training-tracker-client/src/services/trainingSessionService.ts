import type {
  CreateTrainingSessionRequest,
  TrainingSession,
} from '../types/trainingSession';

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

export async function createTrainingSession(
  request: CreateTrainingSessionRequest,
): Promise<TrainingSession> {
  const response = await fetch(`${apiBaseUrl}/training-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Could not create the training session.');
  }

  return response.json() as Promise<TrainingSession>;
}

export async function updateTrainingSession(
  id: number,
  request: CreateTrainingSessionRequest,
): Promise<TrainingSession> {
  const response = await fetch(`${apiBaseUrl}/training-sessions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Could not update the training session.');
  }

  return response.json() as Promise<TrainingSession>;
}

export async function deleteTrainingSession(id: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/training-sessions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Could not delete the training session.');
  }
}