interface GoalBarProps {
  current: number;
  goal: number;
  label: string;
}

function GoalBar({ current, goal, label }: GoalBarProps) {
  const percent = Math.min(Math.round((current / goal) * 100), 100);

  return (
    <div className="stat-goal">
      <div className="stat-goal-bar"><i style={{ width: `${percent}%` }} /></div>
      <span className="stat-goal-label">{percent}% {label}</span>
    </div>
  );
}

export default GoalBar;
