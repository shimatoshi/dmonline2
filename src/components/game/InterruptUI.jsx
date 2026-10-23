// 割り込み効果(ニンジャ・ストライク、ガイアッシュ・カイザー等、相手ターン中に出せる効果)の宣言フロー。
// phase: pick(割り込む側がログから誘発元を選ぶ) → ask(相手が許可するか答える) → resolving(割り込む側が解決中)
const btn = (bg = "var(--border-color)") => ({
  background: bg, color: "#fff", border: "1px solid var(--border-color-dark)", borderRadius: "var(--radius-sm)",
  fontSize: "0.85rem", padding: "6px 12px", minHeight: "38px", cursor: "pointer",
});
const bar = {
  position: "fixed", left: "8px", right: "62px", top: "46px", zIndex: 8350,
  background: "rgba(20,20,20,0.96)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius-md)",
  padding: "8px", color: "#fff", fontSize: "0.85rem", display: "flex", alignItems: "center",
  justifyContent: "space-between", gap: "8px", boxShadow: "0 4px 14px rgba(0,0,0,0.7)",
};
const overlay = { position: "fixed", inset: 0, zIndex: 8450, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" };
const box = { background: "var(--surface-color-dark)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius-lg)", padding: "16px", color: "#fff", width: "min(92%, 420px)", textAlign: "center" };

const fmt = (ts) => {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "";
};

export const InterruptUI = ({ flow, mySide, logs, onPick, onCancel, onAnswer, onFinish }) => {
  if (!flow) return null;
  const mine = flow.side === mySide;

  if (flow.phase === "pick") {
    if (!mine) {
      return <div style={overlay}><div style={box}>相手がカードを宣言しようとしています<br /><span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>しばらくお待ちください</span></div></div>;
    }
    // 割り込む側から見た「相手の動作」を新しい順に
    const cands = logs.filter((l) => l.side !== mySide).slice(0, 15);
    return (
      <div style={overlay}>
        <div style={{ ...box, textAlign: "left", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
          <b style={{ marginBottom: "6px" }}>何に対して割り込みますか?(相手の動作を選択)</b>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {cands.length === 0 && <p style={{ color: "var(--text-dim)", textAlign: "center" }}>相手の操作ログがありません</p>}
            {cands.map((l) => (
              <div key={l.id} onClick={() => onPick(l.text)} style={{ display: "flex", gap: "8px", padding: "9px 4px", borderBottom: "1px solid #262626", cursor: "pointer" }}>
                <span style={{ color: "#666", width: "38px", flexShrink: 0 }}>{fmt(l.createdAt)}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
          <button style={{ ...btn("var(--border-color-dark)"), marginTop: "8px" }} onClick={() => onPick("(指定なし)")}>タイミングを指定せず宣言</button>
          <button style={{ ...btn(), marginTop: "6px" }} onClick={onCancel}>取消</button>
        </div>
      </div>
    );
  }

  if (flow.phase === "ask") {
    if (mine) return <div style={bar}><span>⚡ 相手の確認待ち:「{flow.trigger}」</span><button style={btn("var(--border-color-dark)")} onClick={onCancel}>取消</button></div>;
    return (
      <div style={overlay}>
        <div style={box}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>相手が割り込もうとしています</div>
          <div style={{ marginBottom: "12px" }}>「{flow.trigger}」のタイミングで<br />割り込み効果を使います。よろしいですか?</div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button style={btn("var(--accent-color)")} onClick={() => onAnswer(true)}>はい</button>
            <button style={btn()} onClick={() => onAnswer(false)}>いいえ</button>
          </div>
        </div>
      </div>
    );
  }

  // resolving
  return mine ? (
    <div style={bar}><span>⚡ 割り込み効果を解決中(自由に操作できます)</span><button style={btn("var(--danger-color)")} onClick={onFinish}>終了</button></div>
  ) : (
    <div style={bar}><span>⚡ 相手が割り込み効果を解決中です</span></div>
  );
};
