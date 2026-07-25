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
  const weekDates = getWeekDates(new Date());
  return (
    <main className="calendar-page">
      <h1>Training calendar</h1>
      <p>Plan your sessions and see your training week at a glance.</p>

      <section>
        <h2>This week</h2>

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