import { useMemo } from "react";

interface ActivityHeatmapProps {
  stats: any;
}

export function ActivityHeatmap({ stats }: ActivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    const ra = stats?.recent_activity;
    if (!ra || ra.length === 0)
      return {
        cells: [] as { count: number; date: string }[],
        months: [] as { label: string; col: number }[],
      };

    const firstDate = new Date(ra[0].date + "T00:00:00");
    const padBefore = firstDate.getDay();
    const padded: { count: number; date: string }[] = [];
    for (let i = 0; i < padBefore; i++) padded.push({ count: -1, date: "" });
    for (const entry of ra)
      padded.push({ count: entry.count, date: entry.date });
    while (padded.length % 7 !== 0) padded.push({ count: -1, date: "" });

    const months: { label: string; col: number }[] = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    let lastMonth = -1;
    for (let i = 0; i < padded.length; i++) {
      if (!padded[i].date) continue;
      const m = new Date(padded[i].date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        months.push({ label: monthNames[m], col: Math.floor(i / 7) });
      }
    }

    return { cells: padded, months };
  }, [stats]);

  const heatmapLevel = (v: number) => {
    if (v <= 0) return "";
    if (v === 1) return "l1";
    if (v === 2) return "l2";
    if (v === 3) return "l3";
    return "l4";
  };

  const totalWeeks = Math.ceil(heatmapData.cells.length / 7);

  return (
    <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
      <h3 className="section-title">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        Activity Heatmap
      </h3>

      <div className="heatmap-stats">
        <div className="hm-stat">
          <span className="hm-stat-value">{stats?.total_submissions ?? 0}</span>
          <span className="hm-stat-label">Total submissions</span>
        </div>
        <div className="hm-stat">
          <span className="hm-stat-value">{stats?.active_days ?? 0}</span>
          <span className="hm-stat-label">Active days</span>
        </div>
        <div className="hm-stat">
          <span className="hm-stat-value">{stats?.current_streak ?? 0}</span>
          <span className="hm-stat-label">Current streak</span>
        </div>
        <div className="hm-stat">
          <span className="hm-stat-value">{stats?.longest_streak ?? 0}</span>
          <span className="hm-stat-label">Max streak</span>
        </div>
      </div>

      <div className="heatmap-card">
        <div
          className="hm-months"
          style={{ gridTemplateColumns: `24px repeat(${totalWeeks}, 1fr)` }}
        >
          <span />
          {Array.from({ length: totalWeeks }, (_, col) => {
            const m = heatmapData.months.find((x) => x.col === col);
            return (
              <span key={col} className="hm-month-label">
                {m ? m.label : ""}
              </span>
            );
          })}
        </div>

        <div className="hm-grid-wrap">
          <div className="hm-day-labels">
            <span></span>
            <span>Mon</span>
            <span></span>
            <span>Wed</span>
            <span></span>
            <span>Fri</span>
            <span></span>
          </div>

          <div
            className="heatmap-grid"
            style={{ gridTemplateColumns: `repeat(${totalWeeks}, 1fr)` }}
          >
            {heatmapData.cells.map((cell, i) => (
              <div
                key={i}
                className={`hm-cell ${
                  cell.count < 0 ? "hm-empty" : heatmapLevel(cell.count)
                }`}
                title={
                  cell.date
                    ? `${cell.date}: ${cell.count} submission${
                        cell.count !== 1 ? "s" : ""
                      }`
                    : ""
                }
              />
            ))}
          </div>
        </div>

        <div className="heatmap-footer">
          <span>
            {stats?.total_submissions ?? 0} submissions in the past year
          </span>
          <div className="hm-legend">
            <span>Less</span>
            <div className="hm-cell" />
            <div className="hm-cell l1" />
            <div className="hm-cell l2" />
            <div className="hm-cell l3" />
            <div className="hm-cell l4" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
