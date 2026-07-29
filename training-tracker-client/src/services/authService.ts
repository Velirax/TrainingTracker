import type { StoredAuth } from './apiClient';

const apiBaseUrl = 'http://localhost:5205/api';

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null) as { message?: string } | null;
  return body?.message ?? fallback;
}

export async function login(email: string, password: string): Promise<StoredAuth> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, 'Could not sign in.'));
  return response.json() as Promise<StoredAuth>;
}

export async function register(email: string, password: string, displayName: string): Promise<StoredAuth> {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, 'Could not create your account.'));
  return response.json() as Promise<StoredAuth>;
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, 'Could not process that request.'));
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, token, newPassword }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, 'Could not reset your password.'));
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Best-effort - the client already clears its own local session regardless.
  }
}
