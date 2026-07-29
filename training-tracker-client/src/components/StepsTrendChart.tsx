import { useState } from 'react';
import type { DailySteps } from '../types/dailySteps';

interface StepsTrendChartProps {
  data: DailySteps[];
  dailyStepsGoal: number | null;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function StepsTrendChart({ data, dailyStepsGoal }: StepsTrendChartProps) {
  const [range, setRange] = useState<7 | 30>(7);

  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (range - 1 - index));
    return date;
  });

  const stepsByDate = Object.fromEntries(data.map((entry) => [entry.date, entry.stepCount]));
  const values = days.map((day) => stepsByDate[formatDateKey(day)] ?? 0);
  const maxValue = Math.max(...values, dailyStepsGoal ?? 0, 1);
  const average = Math.round(values.reduce((total, value) => total + value, 0) / values.length);

  return (
    <section className="steps-trend">
      <div className="steps-trend-header">
        <h3>Steps trend</h3>
        <div className="steps-trend-meta">
          <span>Avg {average.toLocaleString()}/day</span>
          <div className="steps-trend-toggle">
            <button aria-pressed={range === 7} type="button" onClick={() => setRange(7)}>7d</button>
            <button aria-pressed={range === 30} type="button" onClick={() => setRange(30)}>30d</button>
          </div>
        </div>
      </div>
      <div className="steps-trend-bars">
        {dailyStepsGoal !== null && (
          <div className="steps-trend-goal-line" style={{ bottom: `${(dailyStepsGoal / maxValue) * 100}%` }} />
        )}
        {days.map((day, index) => {
          const dateKey = formatDateKey(day);
          const value = values[index];
          const showLabel = range === 7 || index % 5 === 0 || index === days.length - 1;

          return (
            <div className="steps-trend-bar-col" key={dateKey} title={`${dateKey}: ${value.toLocaleString()} steps`}>
              <div
                className={`steps-trend-bar${dailyStepsGoal !== null && value >= dailyStepsGoal ? ' goal-met' : ''}`}
                style={{ height: `${(value / maxValue) * 100}%` }}
              />
              <span className="steps-trend-label">{showLabel ? day.getDate() : ''}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default StepsTrendChart;
