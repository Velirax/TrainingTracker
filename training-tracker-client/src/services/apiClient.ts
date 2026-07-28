function tokenHasExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    return payload.exp !== undefined && payload.exp * 1000 <= Date.now();
  } catch { return true; }
}

function clearExpiredAuthentication() {
  localStorage.removeItem('training-tracker-auth');
  window.dispatchEvent(new Event('training-tracker-auth-expired'));
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const auth = JSON.parse(localStorage.getItem('training-tracker-auth') ?? 'null');
  if (auth?.token && tokenHasExpired(auth.token)) {
    clearExpiredAuthentication();
    throw new Error('Your sign-in session has expired. Please sign in again.');
  }
  const headers = new Headers(init?.headers);
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) clearExpiredAuthentication();
  return response;
}
