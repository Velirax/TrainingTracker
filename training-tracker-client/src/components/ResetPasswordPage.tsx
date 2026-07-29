import { type FormEvent, useState } from 'react';
import { resetPassword } from '../services/authService';

interface ResetPasswordPageProps {
  email: string;
  token: string;
  onDone: () => void;
}

export default function ResetPasswordPage({ email, token, onDone }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, token, newPassword);
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="page-kicker">Training Tracker</span>
        <h1>Set a new password</h1>
        {isDone ? (
          <>
            <p>Your password has been reset. Please sign in again.</p>
            <button type="button" onClick={onDone}>Go to sign in</button>
          </>
        ) : (
          <>
            <p>Resetting the password for {email}.</p>
            <form onSubmit={submit}>
              <label>New password
                <input minLength={8} required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </label>
              <label>Confirm new password
                <input minLength={8} required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              <button disabled={isSubmitting} type="submit">{isSubmitting ? 'Please wait...' : 'Reset password'}</button>
              {error && <p role="alert">{error}</p>}
            </form>
            <button className="secondary-button" type="button" onClick={onDone}>Back to sign in</button>
          </>
        )}
      </section>
    </main>
  );
}
