import type { TrainingSession } from '../types/trainingSession';

interface MonthCalendarProps {
  selectedDate: Date;
  sessions: TrainingSession[];
  onSessionClick: (sessionId: number) => void;
  firstDay?: number;
}

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
});

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getMonthGridDates(selectedDate: Date, firstDay: number): Date[] {
  const firstDayOfMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
  );
  const daysSinceFirstDay = (firstDayOfMonth.getDay() - firstDay + 7) % 7;
  const firstGridDay = new Date(firstDayOfMonth);

  firstGridDay.setDate(firstGridDay.getDate() - daysSinceFirstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    return day;
  });
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

function MonthCalendar({
  selectedDate,
  sessions,
  onSessionClick,
  firstDay = 1,
}: MonthCalendarProps) {
  const dates = getMonthGridDates(selectedDate, firstDay);
  const weekdays = dates.slice(0, 7);
  const todayKey = formatDateKey(new Date());

  return (
    <div className="month-calendar">
      <div className="month-calendar-weekdays">
        {weekdays.map((date) => (
          <div key={date.getDay()}>{weekdayFormatter.format(date)}</div>
        ))}
      </div>

      <div className="month-calendar-grid">
        {dates.map((date) => {
          const dateKey = formatDateKey(date);
          const daySessions = sessions.filter(
            (session) => session.sessionDate === dateKey,
          );
          const isOutsideMonth = date.getMonth() !== selectedDate.getMonth();

          return (
            <div
              key={dateKey}
              className={`month-calendar-day${isOutsideMonth ? ' month-calendar-day-outside' : ''}`}
            >
              <span className={dateKey === todayKey ? 'month-calendar-today' : ''}>
                {date.getDate()}
              </span>

              {daySessions.slice(0, 3).map((session) => (
                <button
                  key={session.id}
                  className="month-calendar-session"
                  style={{ backgroundColor: session.sportFolderColor }}
                  type="button"
                  data-exercise-tooltip={formatExerciseTooltip(session)}
                  onClick={() => onSessionClick(session.id)}
                  aria-label={`${session.title}, ${session.startTime.slice(0, 5)}`}
                >
                  <span className="month-calendar-session-time">
                    {session.startTime.slice(0, 5)}
                  </span>
                  <span>{session.title}</span>
                </button>
              ))}
              {daySessions.length > 3 && (
                <span className="month-calendar-more-sessions">
                  +{daySessions.length - 3} more
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthCalendar;
