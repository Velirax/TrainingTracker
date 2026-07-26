export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const auth = JSON.parse(localStorage.getItem('training-tracker-auth') ?? 'null');
  const headers = new Headers(init?.headers);
  if (auth?.token) headers.set('Authorization', `Bearer ${auth.token}`);
  return fetch(input, { ...init, headers });
}
