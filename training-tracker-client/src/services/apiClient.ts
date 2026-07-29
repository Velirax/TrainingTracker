export interface StoredAuth {
  token: string;
  tokenExpiresAt: string;
  refreshToken: string;
  user: { id: string; email: string; displayName: string };
}

const authStorageKey = 'training-tracker-auth';
const refreshBufferMs = 10_000;

function readAuth(): StoredAuth | null {
  return JSON.parse(localStorage.getItem(authStorageKey) ?? 'null');
}

function writeAuth(auth: StoredAuth) {
  localStorage.setItem(authStorageKey, JSON.stringify(auth));
}

function clearExpiredAuthentication() {
  localStorage.removeItem(authStorageKey);
  window.dispatchEvent(new Event('training-tracker-auth-expired'));
}

function accessTokenExpiresSoon(auth: StoredAuth): boolean {
  return new Date(auth.tokenExpiresAt).getTime() <= Date.now() + refreshBufferMs;
}

// Concurrent requests that all notice an expiring token must not each fire
// their own refresh call - the second refresh would revoke the first's
// rotated token and fail. Sharing one in-flight promise avoids that.
let refreshPromise: Promise<StoredAuth | null> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<StoredAuth | null> {
  refreshPromise ??= (async () => {
    try {
      const response = await fetch('http://localhost:5205/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return null;

      const result = await response.json() as StoredAuth;
      writeAuth(result);
      return result;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let auth = readAuth();

  if (auth && accessTokenExpiresSoon(auth)) {
    auth = await refreshAccessToken(auth.refreshToken);
    if (!auth) {
      clearExpiredAuthentication();
      throw new Error('Your sign-in session has expired. Please sign in again.');
    }
  }

  const headers = new Headers(init?.headers);
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`);
  let response = await fetch(input, { ...init, headers });

  // Fallback for cases the proactive expiry check can miss (clock skew, a
  // token revoked server-side) rather than only reacting to it up front.
  if (response.status === 401 && auth?.refreshToken) {
    const refreshed = await refreshAccessToken(auth.refreshToken);
    if (refreshed) {
      const retryHeaders = new Headers(init?.headers);
      retryHeaders.set('Authorization', `Bearer ${refreshed.token}`);
      response = await fetch(input, { ...init, headers: retryHeaders });
    }
  }

  if (response.status === 401) clearExpiredAuthentication();
  return response;
}
