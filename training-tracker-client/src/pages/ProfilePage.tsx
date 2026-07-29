import { type FormEvent, useEffect, useState } from 'react';
import { getPreferences, type Preferences, updatePreferences } from '../services/profileService';
import { getTrainingSessions } from '../services/trainingSessionService';
import type { TrainingSession } from '../types/trainingSession';

interface ProfilePageProps { user: { displayName: string; email: string }; onSignOut: () => void; }

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function computeLongestStreak(sessions: TrainingSession[]): number {
  const completedDates = Array.from(new Set(
    sessions.filter((session) => session.status === 'Completed').map((session) => session.sessionDate),
  )).sort();
  let longest = 0;
  let current = 0;
  let previousDate: string | null = null;

  for (const dateKey of completedDates) {
    if (previousDate) {
      const expected = new Date(`${previousDate}T00:00:00`);
      expected.setDate(expected.getDate() + 1);
      current = formatDateForApi(expected) === dateKey ? current + 1 : 1;
    } else {
      current = 1;
    }

    longest = Math.max(longest, current);
    previousDate = dateKey;
  }

  return longest;
}

export default function ProfilePage({ user, onSignOut }: ProfilePageProps) {
  const [preferences, setPreferences] = useState<Preferences>({ distanceUnit: 'km', weekStartsOn: 1, defaultCalendarView: 'week', weightKg: null });
  const [message, setMessage] = useState('');
  const [lifetimeSessions, setLifetimeSessions] = useState<TrainingSession[]>([]);

  useEffect(() => { getPreferences().then(setPreferences).catch(() => setMessage('Could not load preferences.')); }, []);

  useEffect(() => {
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    getTrainingSessions(formatDateForApi(threeYearsAgo), formatDateForApi(oneYearAhead))
      .then(setLifetimeSessions)
      .catch(() => {});
  }, []);

  async function save(event: FormEvent) { event.preventDefault(); try { const saved = await updatePreferences(preferences); setPreferences(saved); setMessage('Preferences saved.'); } catch { setMessage('Could not save preferences.'); } }

  const totalSessions = lifetimeSessions.length;
  const hoursTrained = lifetimeSessions
    .filter((session) => session.status === 'Completed')
    .reduce((total, session) => total + session.durationMinutes, 0) / 60;
  const longestStreak = computeLongestStreak(lifetimeSessions);

  return (
    <main>
      <header className="page-header">
        <span className="page-kicker">Account</span>
        <h1><span>Your</span> profile.</h1>
        <p>Manage your Training Tracker account.</p>
      </header>

      <div className="id-card">
        <div className="id-photo">{user.displayName.slice(0, 2).toUpperCase()}</div>
        <div className="id-info">
          <h2>{user.displayName}</h2>
          <div className="role">{user.email}</div>
          <div className="id-stats">
            <div><b>{totalSessions}</b><span>Total sessions</span></div>
            <div><b>{hoursTrained.toFixed(0)}</b><span>Hours trained</span></div>
            <div><b>{longestStreak}</b><span>Longest streak</span></div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Connected apps</h3>
        <div className="kv-row">
          <span className="k">Samsung Health</span>
          <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="conn-pill not-connected">Not connected</span>
            <button className="btn primary" style={{ padding: '5px 12px', fontSize: 12 }} type="button" disabled>Connect</button>
          </span>
        </div>
      </div>

      <section className="panel profile-preferences">
        <h3>Preferences</h3>
        <form onSubmit={save}>
          <label>Distance unit
            <select value={preferences.distanceUnit} onChange={(event) => setPreferences({ ...preferences, distanceUnit: event.target.value as Preferences['distanceUnit'] })}>
              <option value="km">Kilometres (km)</option>
              <option value="mi">Miles (mi)</option>
            </select>
          </label>
          <label>Week starts on
            <select value={preferences.weekStartsOn} onChange={(event) => setPreferences({ ...preferences, weekStartsOn: Number(event.target.value) })}>
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </label>
          <label>Default calendar view
            <select value={preferences.defaultCalendarView} onChange={(event) => setPreferences({ ...preferences, defaultCalendarView: event.target.value as Preferences['defaultCalendarView'] })}>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <label>Weight (for calorie calc)
            <input
              max={300}
              min={20}
              placeholder="e.g. 75"
              step="0.1"
              type="number"
              value={preferences.weightKg ?? ''}
              onChange={(event) => setPreferences({ ...preferences, weightKg: event.target.value ? Number(event.target.value) : null })}
            />
          </label>
          <button type="submit">Save preferences</button>
        </form>
        {message && <p role="status">{message}</p>}
      </section>

      <button className="danger-button" type="button" onClick={onSignOut}>Sign out</button>
    </main>
  );
}
