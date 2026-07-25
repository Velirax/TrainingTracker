import type {
  CreateSportFolderRequest,
  SportFolder,
} from '../types/sportFolder';

const apiBaseUrl = 'http://localhost:5205/api';

export async function getSportFolders(): Promise<SportFolder[]> {
  const response = await fetch(`${apiBaseUrl}/sport-folders`);

  if (!response.ok) {
    throw new Error('Could not load sport folders.');
  }

  return response.json() as Promise<SportFolder[]>;
}

export async function createSportFolder(request: CreateSportFolderRequest,): Promise<SportFolder> {
  const response = await fetch(`${apiBaseUrl}/sport-folders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Could not create the sport folder.');
  }

  return response.json() as Promise<SportFolder>;
}