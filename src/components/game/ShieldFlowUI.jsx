// シールドブレイク後の処理。攻撃側には「処理中」バナー、受ける側には解決確認ダイアログと解決中バナーを出す。
const btn = (bg = "var(--border-color)") => ({
  background: bg, color: "#fff", border: "1px solid var(--border-color-dark)", borderRadius: "var(--radius-sm)",
  fontSize: "0.85rem", padding: "6px 12px", minHeight: "38px", cursor: "pointer",
});
const bar = {
  position: "fixed", left: "8px", right: "62px", top: "46px", zIndex: 8300,
  background: "rgba(20,20,20,0.96)", border: "1px solid var(--warning-color)", borderRadius: "var(--radius-md)",
  padding: "8px", color: "#fff", fontSize: "0.85rem", display: "flex", alignItems: "center",
  justifyContent: "space-between", gap: "8px", boxShadow: "0 4px 14px rgba(0,0,0,0.7)",
};

export const ShieldFlowUI = ({ flow, mySide, onAnswer, onFinish }) => {
  if (!flow) return null;
  const isDefender = mySide === flow.defenderSide;

  if (!isDefender) {
    return (
      <div style={bar}>
        <span>🛡 シールド処理中(相手が対応しています)</span>
        <button style={btn("var(--border-color-dark)")} onClick={onFinish}>中止</button>
      </div>
    );
  }
  if (flow.phase === "ask") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 8400, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "var(--surface-color-dark)", border: "1px solid var(--warning-color)", borderRadius: "var(--radius-lg)", padding: "16px", color: "#fff", textAlign: "center", maxWidth: "80%" }}>
          <div style={{ marginBottom: "4px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>シールドが{flow.count}枚ブレイクされました</div>
          <div style={{ marginBottom: "12px" }}>効果を解決しますか?</div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button style={btn("var(--danger-color)")} onClick={() => onAnswer(true)}>する</button>
            <button style={btn()} onClick={() => onAnswer(false)}>しない</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={bar}>
      <span>🛡 シールド効果を解決中(自由に操作できます)</span>
      <button style={btn("var(--danger-color)")} onClick={onFinish}>処理終了</button>
    </div>
  );
};
