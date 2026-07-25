import type { SportFolder } from '../types/sportFolder';

const apiBaseUrl = 'http://localhost:5205/api';

export async function getSportFolders(): Promise<SportFolder[]> {
  const response = await fetch(`${apiBaseUrl}/sport-folders`);

  if (!response.ok) {
    throw new Error('Could not load sport folders.');
  }

  return response.json() as Promise<SportFolder[]>;
}