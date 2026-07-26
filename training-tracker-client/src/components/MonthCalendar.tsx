import type { TrainingSession } from '../types/trainingSession';

interface MonthCalendarProps {
  selectedDate: Date;
  sessions: TrainingSession[];
  onSessionClick: (sessionId: number) => void;
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

function getMonthGridDates(selectedDate: Date): Date[] {
  const firstDayOfMonth = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    1,
  );
  const daysSinceMonday = (firstDayOfMonth.getDay() + 6) % 7;
  const firstGridDay = new Date(firstDayOfMonth);

  firstGridDay.setDate(firstGridDay.getDate() - daysSinceMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstGridDay);
    day.setDate(firstGridDay.getDate() + index);
    return day;
  });
}

function MonthCalendar({
  selectedDate,
  sessions,
  onSessionClick,
}: MonthCalendarProps) {
  const dates = getMonthGridDates(selectedDate);
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

              {daySessions.map((session) => (
                <button
                  key={session.id}
                  className="month-calendar-session"
                  style={{ backgroundColor: session.sportFolderColor }}
                  type="button"
                  onClick={() => onSessionClick(session.id)}
                >
                  {session.sportFolderIcon} {session.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthCalendar;
