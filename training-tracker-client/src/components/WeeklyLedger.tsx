import { useState } from 'react';
import type { TrainingSession } from '../types/trainingSession';

interface WeeklyLedgerProps {
  mode: 'week' | 'month';
  anchorDate: Date;
  firstDay: number;
  sessions: TrainingSession[];
  stepsByDate?: Record<string, number>;
  onSessionClick: (sessionId: number) => void;
  onDayClick: (date: Date) => void;
  onSessionReschedule: (sessionId: number, newDate: Date) => void;
}

function formatStepCount(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const weekRangeFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function startOfWeek(date: Date, firstDay: number): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (start.getDay() - firstDay + 7) % 7;
  start.setDate(start.getDate() - offset);
  return start;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayCount = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000);
  return Math.ceil((dayCount + startOfYear.getDay() + 1) / 7);
}

function getWeekStarts(mode: 'week' | 'month', anchorDate: Date, firstDay: number): Date[] {
  if (mode === 'week') {
    return [startOfWeek(anchorDate, firstDay)];
  }

  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const lastOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const starts: Date[] = [];
  let cursor = startOfWeek(firstOfMonth, firstDay);

  while (cursor <= lastOfMonth) {
    starts.push(new Date(cursor));
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  return starts;
}

function formatExerciseTooltip(session: TrainingSession): string {
  if (session.exercises.length === 0) {
    return 'No exercises logged.';
  }

  return session.exercises.map((exercise) => {
    const values = Object.entries(exercise.trackingValues)
      .filter(([, value]) => value)
      .map(([field, value]) => `${field}: ${value}`)
      .join(', ');

    return values ? `${exercise.exerciseName} — ${values}` : exercise.exerciseName;
  }).join('\n');
}

function sessionTagClass(session: TrainingSession): string {
  if (session.status === 'Completed') return 'done';
  if (session.status === 'Cancelled') return 'cancelled';

  const sessionDateTime = new Date(`${session.sessionDate}T${session.startTime}`);
  return sessionDateTime < new Date() ? 'missed' : 'planned';
}

function WeeklyLedger({
  mode,
  anchorDate,
  firstDay,
  sessions,
  stepsByDate,
  onSessionClick,
  onDayClick,
  onSessionReschedule,
}: WeeklyLedgerProps) {
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const weekStarts = getWeekStarts(mode, anchorDate, firstDay);
  const todayKey = formatDateKey(new Date());
  const orderedWeekdayLabels = Array.from({ length: 7 }, (_, index) =>
    weekdayLabels[(firstDay + index) % 7]);

  function handleDrop(event: React.DragEvent<HTMLDivElement>, date: Date) {
    event.preventDefault();
    setDragOverDateKey(null);
    const sessionId = Number(event.dataTransfer.getData('text/plain'));

    if (sessionId) {
      onSessionReschedule(sessionId, date);
    }
  }

  return (
    <div className="ledger">
      <div className="ledger-head">
        <div>Week</div>
        {orderedWeekdayLabels.map((label) => <div key={label}>{label}</div>)}
      </div>

      {weekStarts.map((weekStart) => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const isCurrentWeek = todayKey >= formatDateKey(weekStart) && todayKey <= formatDateKey(weekEnd);
        const days = Array.from({ length: 7 }, (_, index) => {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + index);
          return day;
        });

        return (
          <div className={`ledger-row${isCurrentWeek ? ' current-week' : ''}`} key={formatDateKey(weekStart)}>
            <div className="wk-label">
              <b>Wk {getWeekNumber(weekStart)}</b>
              {weekRangeFormatter.format(weekStart)}–{weekRangeFormatter.format(weekEnd)}
            </div>

            {days.map((day) => {
              const dateKey = formatDateKey(day);
              const daySessions = sessions
                .filter((session) => session.sessionDate === dateKey)
                .sort((first, second) => first.startTime.localeCompare(second.startTime));
              const isToday = dateKey === todayKey;
              const isOutsideMonth = mode === 'month' && day.getMonth() !== anchorDate.getMonth();

              return (
                <div
                  className={`day-cell${isToday ? ' is-today' : ''}${isOutsideMonth ? ' day-cell-outside' : ''}${dragOverDateKey === dateKey ? ' day-cell-drop-target' : ''}`}
                  key={dateKey}
                  onClick={(event) => {
                    if (event.target === event.currentTarget || (event.target as HTMLElement).classList.contains('day-num')) {
                      onDayClick(day);
                    }
                  }}
                  onDragOver={(event) => { event.preventDefault(); setDragOverDateKey(dateKey); }}
                  onDragLeave={() => setDragOverDateKey((current) => (current === dateKey ? null : current))}
                  onDrop={(event) => handleDrop(event, day)}
                >
                  <div className="day-num" onClick={() => onDayClick(day)}>
                    <span>{day.getDate()}</span>
                  </div>
                  {stepsByDate?.[dateKey] !== undefined && (
                    <div className="day-steps">{formatStepCount(stepsByDate[dateKey])} steps</div>
                  )}

                  {daySessions.map((session) => (
                    <button
                      className={`sess-tag ${sessionTagClass(session)}`}
                      data-exercise-tooltip={session.exercises.length > 0 ? formatExerciseTooltip(session) : undefined}
                      draggable
                      key={session.id}
                      type="button"
                      onClick={(event) => { event.stopPropagation(); onSessionClick(session.id); }}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.setData('text/plain', String(session.id));
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                    >
                      <span className="dot" style={{ background: session.sportFolderColor }} />
                      {session.startTime.slice(0, 5)} {session.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default WeeklyLedger;
