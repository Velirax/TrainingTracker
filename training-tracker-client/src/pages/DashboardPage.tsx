import { useState } from 'react';

const weekRangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

function getWeekDates(date: Date): Date[] {
  const startOfWeek = new Date(date);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;

  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + index);
    return day;
  });
}

function DashboardPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const weekDates = getWeekDates(selectedDate);

    function changeWeek(days: number) {
    setSelectedDate((currentDate) => {
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + days);
        return nextDate;
    });
    }
    return (
    <main className="calendar-page">
        <h1>Training calendar</h1>
        <p>Plan your sessions and see your training week at a glance.</p>

        <section>
        <div className="calendar-toolbar">
        <h2>
            {weekRangeFormatter.format(weekDates[0])} –{' '}
            {weekRangeFormatter.format(weekDates[6])}
        </h2>

        <div>
            <button type="button" onClick={() => changeWeek(-7)}>
            Previous
            </button>
            <button type="button" onClick={() => setSelectedDate(new Date())}>
            Today
            </button>
            <button type="button" onClick={() => changeWeek(7)}>
            Next
            </button>
        </div>
        </div>

        <div className="week-grid">
            {weekDates.map((day) => (
            <div className="day-column" key={day.getTime()}>
                <h3>{dayFormatter.format(day)}</h3>
                <p>No sessions planned</p>
            </div>
            ))}
        </div>
        </section>
    </main>
    );
}

export default DashboardPage;