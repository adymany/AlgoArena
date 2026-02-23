interface StatsGridProps {
  solved: number;
  byDiff: { easy: number; medium: number; hard: number };
}

export function StatsGrid({ solved, byDiff }: StatsGridProps) {
  return (
    <div className="stats-grid stagger">
      <div className="stat-box">
        <div className="stat-big accent">{solved}</div>
        <div className="stat-label-sm">Solved</div>
      </div>
      <div className="stat-box">
        <div className="stat-big easy">{byDiff.easy}</div>
        <div className="stat-label-sm">Easy</div>
      </div>
      <div className="stat-box">
        <div className="stat-big medium">{byDiff.medium}</div>
        <div className="stat-label-sm">Medium</div>
      </div>
      <div className="stat-box">
        <div className="stat-big hard">{byDiff.hard}</div>
        <div className="stat-label-sm">Hard</div>
      </div>
    </div>
  );
}
