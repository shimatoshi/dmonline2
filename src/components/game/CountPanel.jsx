// 経過ターンと、自分/相手の各ゾーンの枚数を一覧表示する
const ROWS = [
  ["手札", "hand"], ["マナ", "mana"], ["山札", "deck"], ["墓地", "grave"], ["シールド", "shield"],
];

export const CountPanel = ({ turn, mine, theirs, onClose }) => (
  <div className="overlay overlay-dark" onClick={onClose} style={{ zIndex: 4500, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "#1a1a1a", width: "min(320px, 90%)", borderRadius: "12px", border: "1px solid var(--border-color)", padding: "14px" }}>
      <div style={{ textAlign: "center", color: "#fff", fontWeight: "bold", marginBottom: "10px" }}>経過ターン {turn}</div>
      <table style={{ width: "100%", borderCollapse: "collapse", color: "#ddd", fontSize: "0.95rem", textAlign: "center" }}>
        <thead>
          <tr style={{ color: "#888", fontSize: "0.8rem" }}>
            <th style={{ padding: "4px" }}></th><th style={{ color: "#64b5f6" }}>自分</th><th style={{ color: "#ef9a9a" }}>相手</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([label, key]) => (
            <tr key={key} style={{ borderTop: "1px solid #262626" }}>
              <td style={{ padding: "7px 4px", textAlign: "left" }}>{label}</td>
              <td style={{ fontWeight: "bold" }}>{mine[key]}</td>
              <td style={{ fontWeight: "bold" }}>{theirs[key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn" onClick={onClose} style={{ marginTop: "12px", width: "100%", minHeight: "44px", background: "var(--border-color-dark)", color: "#fff" }}>閉じる</button>
    </div>
  </div>
);
