interface Submission {
  id: number;
  problem_id: string;
  language: string;
  status: string;
  created_at: string;
}

interface SubmissionHistoryProps {
  submissions: Submission[];
}

export function SubmissionHistory({ submissions }: SubmissionHistoryProps) {
  return (
    <div className="fade-in-up" style={{ animationDelay: "0.4s" }}>
      <h3 className="section-title">
        <svg viewBox="0 0 24 24">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Recent Submissions
      </h3>
      <div className="heatmap-card" style={{ overflow: "auto" }}>
        <table className="sub-table stagger">
          <thead>
            <tr>
              <th>Problem</th>
              <th>Language</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {submissions.slice(0, 20).map((s, i) => (
              <tr key={i} style={{ animationDelay: `${0.05 * i}s` }}>
                <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {s.problem_id}
                </td>
                <td>{s.language}</td>
                <td>
                  <span
                    className={`sub-status ${
                      s.status === "Pass"
                        ? "accepted"
                        : s.status === "TLE"
                          ? "tle"
                          : "wrong"
                    }`}
                  >
                    {s.status === "Pass"
                      ? "Accepted"
                      : s.status === "TLE"
                        ? "Time Limit Exceeded"
                        : "Wrong Answer"}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)" }}>
                  {s.created_at
                    ? new Date(s.created_at).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    padding: 32,
                  }}
                >
                  No submissions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
