export default function AISidebarSkeleton({ width = 320 }: { width?: number }) {
  return (
    <div className="ai-sidebar" style={{ width: width, height: "100%" }}>
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div
            className="ai-avatar"
            style={{
              width: "28px",
              height: "28px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "50%",
            }}
          />
          <div className="ai-header-text">
            <div
              style={{
                height: "14px",
                width: "80px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                marginBottom: "4px",
              }}
            />
            <div
              style={{
                height: "10px",
                width: "50px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Messages Skeleton */}
      <div className="ai-messages">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`ai-message ${i % 2 === 0 ? "user" : "assistant"}`}
            style={{ opacity: 0.6 }}
          >
            <div
              className="ai-message-avatar"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "transparent",
              }}
            />
            <div className="ai-message-content">
              <div
                className="ai-message-bubble"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  width: i % 2 === 0 ? "140px" : "180px",
                  height: "40px",
                }}
              />
              <div
                style={{
                  height: "10px",
                  width: "40px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "4px",
                  marginTop: "4px",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Input Skeleton */}
      <div className="ai-input-container">
        <div
          className="ai-input"
          style={{
            background: "rgba(255,255,255,0.05)",
            height: "38px",
            border: "none",
          }}
        />
        <div
          className="ai-send-btn"
          style={{ background: "rgba(255,255,255,0.1)", border: "none" }}
        />
      </div>
    </div>
  );
}
