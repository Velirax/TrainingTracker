import { type FormEvent, useState } from 'react';
import { forgotPassword, login, register } from '../services/authService';
import type { StoredAuth } from '../services/apiClient';

interface AuthPageProps {
  onAuthenticated: (auth: StoredAuth) => void;
  initialMessage?: string;
}

type Mode = 'login' | 'register' | 'forgot';

export default function AuthPage({ onAuthenticated, initialMessage = '' }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(initialMessage);
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setInfo('');
    setIsSubmitting(true);

    try {
      if (mode === 'forgot') {
        await forgotPassword(email);
        setInfo('If an account exists for that email, a reset link has been generated. (No email service is configured yet - check the API server logs for the link.)');
        return;
      }

      const auth = mode === 'register'
        ? await register(email, password, displayName)
        : await login(email, password);

      onAuthenticated(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server. Check that the API is running and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const heading = mode === 'register' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back';
  const subtext = mode === 'register'
    ? 'Start building your personal training history.'
    : mode === 'forgot'
      ? "Enter your account email and we'll generate a reset link."
      : 'Sign in to continue your training plan.';

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="page-kicker">Training Tracker</span>
        <h1>{heading}</h1>
        <p>{subtext}</p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>Display name
              <input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
          )}
          <label>Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          {mode !== 'forgot' && (
            <label>Password
              <input minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
          )}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Please wait...' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}
          </button>
          {error && <p role="alert">{error}</p>}
          {info && <p role="status">{info}</p>}
        </form>

        {mode === 'login' && (
          <button className="secondary-button" type="button" onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}>
            Forgot your password?
          </button>
        )}

        <button
          className="secondary-button"
          type="button"
          onClick={() => { setMode((current) => (current === 'register' ? 'login' : current === 'forgot' ? 'login' : 'register')); setError(''); setInfo(''); }}
        >
          {mode === 'register' ? 'I already have an account' : mode === 'forgot' ? 'Back to sign in' : 'Create an account'}
        </button>
      </section>
    </main>
  );
}
