import type {
  CreateExerciseRequest,
  Exercise,
  UpdateExerciseRequest,
} from '../types/exercise';

const apiBaseUrl = 'http://localhost:5205/api';

export async function getExercises(sportFolderId?: number): Promise<Exercise[]> {
  const query = sportFolderId === undefined
    ? ''
    : `?sportFolderId=${sportFolderId}`;

  const response = await fetch(`${apiBaseUrl}/exercises${query}`);

  if (!response.ok) {
    throw new Error('Could not load exercises.');
  }

  return response.json() as Promise<Exercise[]>;
}

export async function createExercise(
  request: CreateExerciseRequest,
): Promise<Exercise> {
  const response = await fetch(`${apiBaseUrl}/exercises`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Could not create the exercise.');
  }

  return response.json() as Promise<Exercise>;
}

export async function updateExercise(
  id: number,
  request: UpdateExerciseRequest,
): Promise<Exercise> {
  const response = await fetch(`${apiBaseUrl}/exercises/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Could not update the exercise.');
  }

  return response.json() as Promise<Exercise>;
}
