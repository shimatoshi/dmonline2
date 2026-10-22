const fmt = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
};

export const GameLogPanel = ({ logs, mySide, onClose }) => (
  <div className="overlay overlay-dark" onClick={onClose} style={{ zIndex: 4500, display: "flex", alignItems: "flex-end" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "#1a1a1a", width: "100%", maxHeight: "65vh", borderRadius: "12px 12px 0 0", border: "1px solid #444", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid #333" }}>
        <b style={{ color: "#fff" }}>対戦ログ</b>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: "1.2rem", minWidth: "44px", minHeight: "44px" }}>✕</button>
      </div>
      <div style={{ overflowY: "auto", padding: "6px 14px 16px" }}>
        {logs.length === 0 && <p style={{ color: "#777", textAlign: "center" }}>まだ操作がありません</p>}
        {logs.map((l) => {
          const mine = l.side === mySide;
          return (
            <div key={l.id} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: "1px solid #262626", fontSize: "0.85rem" }}>
              <span style={{ color: "#666", flexShrink: 0, width: "38px" }}>{fmt(l.createdAt)}</span>
              <span style={{ color: mine ? "#64b5f6" : "#ef9a9a", flexShrink: 0, width: "34px", fontWeight: "bold" }}>{mine ? "自分" : "相手"}</span>
              <span style={{ color: "#ddd" }}>{l.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
