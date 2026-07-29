import { apiFetch } from './apiClient';

const apiBaseUrl = 'http://localhost:5205/api';

export interface SamsungHealthImportRow {
  rowIndex: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  calories: number | null;
  rawSportLabel: string | null;
  suggestedSportFolderId: number | null;
}

export interface SamsungHealthCommitRow {
  sessionDate: string;
  startTime: string;
  endTime: string;
  calories: number | null;
  sportFolderId: number;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? fallback;
}

export async function previewSamsungHealthImport(file: File): Promise<SamsungHealthImportRow[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch(`${apiBaseUrl}/imports/samsung-health/preview`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not read that file.'));
  }

  return response.json() as Promise<SamsungHealthImportRow[]>;
}

export async function commitSamsungHealthImport(
  rows: SamsungHealthCommitRow[],
): Promise<{ imported: number; skippedDuplicates: number }> {
  const response = await apiFetch(`${apiBaseUrl}/imports/samsung-health/commit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not import these sessions.'));
  }

  return response.json() as Promise<{ imported: number; skippedDuplicates: number }>;
}
