import { type FormEvent, useState } from 'react';

interface AuthPageProps { onAuthenticated: (name: string) => void; }

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [displayName, setDisplayName] = useState(''); const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const response = await fetch(`http://localhost:5205/api/auth/${isRegistering ? 'register' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(isRegistering ? { email, password, displayName } : { email, password }) });
    if (!response.ok) { const body = await response.json().catch(() => null); setError(body?.message ?? 'Could not sign in.'); return; }
    const result = await response.json(); localStorage.setItem('training-tracker-auth', JSON.stringify(result)); onAuthenticated(result.user.displayName);
  }
  return <main className="auth-page"><section className="auth-card"><span className="page-kicker">Training Tracker</span><h1>{isRegistering ? 'Create your account' : 'Welcome back'}</h1><p>{isRegistering ? 'Start building your personal training history.' : 'Sign in to continue your training plan.'}</p><form onSubmit={submit}>{isRegistering && <><label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} required /></label></>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Password<input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></label><button type="submit">{isRegistering ? 'Create account' : 'Sign in'}</button>{error && <p role="alert">{error}</p>}</form><button className="secondary-button" type="button" onClick={() => setIsRegistering(v => !v)}>{isRegistering ? 'I already have an account' : 'Create an account'}</button></section></main>;
}
