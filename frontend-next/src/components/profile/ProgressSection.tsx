interface ProgressSectionProps {
  solved: number;
  totalProblems: number;
  byDiff: { easy: number; medium: number; hard: number };
  byDiffTotal: { easy: number; medium: number; hard: number };
}

export function ProgressSection({
  solved,
  totalProblems,
  byDiff,
  byDiffTotal,
}: ProgressSectionProps) {
  const circumference = 2 * Math.PI * 70;
  const easyLen =
    totalProblems > 0 ? (byDiff.easy / totalProblems) * circumference : 0;
  const medLen =
    totalProblems > 0 ? (byDiff.medium / totalProblems) * circumference : 0;
  const hardLen =
    totalProblems > 0 ? (byDiff.hard / totalProblems) * circumference : 0;

  const easyTotal = Math.max(byDiffTotal.easy, 1);
  const medTotal = Math.max(byDiffTotal.medium, 1);
  const hardTotal = Math.max(byDiffTotal.hard, 1);

  return (
    <div className="progress-row fade-in-up" style={{ animationDelay: "0.1s" }}>
      <div className="donut-wrap">
        <svg viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="var(--bg-input)"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="var(--diff-easy)"
            strokeWidth="12"
            strokeDasharray={`${easyLen} ${circumference - easyLen}`}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="var(--diff-medium)"
            strokeWidth="12"
            strokeDasharray={`${medLen} ${circumference - medLen}`}
            strokeDashoffset={`${-easyLen}`}
            strokeLinecap="round"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="var(--diff-hard)"
            strokeWidth="12"
            strokeDasharray={`${hardLen} ${circumference - hardLen}`}
            strokeDashoffset={`${-(easyLen + medLen)}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="donut-center">
          <div className="donut-count">{solved}</div>
          <div className="donut-total">/ {totalProblems}</div>
        </div>
      </div>

      <div className="progress-bars">
        <div className="prog-item">
          <label>
            <span>Easy</span>
            <span>
              {byDiff.easy} / {Math.round(easyTotal)}
            </span>
          </label>
          <div className="prog-track">
            <div
              className="prog-fill easy"
              style={{ width: `${(byDiff.easy / easyTotal) * 100}%` }}
            />
          </div>
        </div>
        <div className="prog-item">
          <label>
            <span>Medium</span>
            <span>
              {byDiff.medium} / {Math.round(medTotal)}
            </span>
          </label>
          <div className="prog-track">
            <div
              className="prog-fill medium"
              style={{ width: `${(byDiff.medium / medTotal) * 100}%` }}
            />
          </div>
        </div>
        <div className="prog-item">
          <label>
            <span>Hard</span>
            <span>
              {byDiff.hard} / {Math.round(hardTotal)}
            </span>
          </label>
          <div className="prog-track">
            <div
              className="prog-fill hard"
              style={{ width: `${(byDiff.hard / hardTotal) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
