// 攻撃の流れ(対象選択 → 攻撃時能力の確認 → 解決中 → シールドブレイク)を表示する。
// 点線は攻撃クリーチャーから対象(またはドラッグ中の指先)へ引く。
const centerOf = (selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export const attackerSelector = (idx) => `[data-zone-id="battle"] [data-index="${idx}"]`;
export const targetSelector = (target) =>
  target?.type === "creature"
    ? `[data-zone-id="opponent-battle"] [data-index="${target.index}"]`
    : `[data-zone-id="opponent-shield"]`;

const Line = ({ from, to }) => {
  if (!from || !to) return null;
  return (
    <svg style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 8000, pointerEvents: "none" }}>
      <defs>
        <marker id="atk-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--danger-color)" />
        </marker>
      </defs>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--danger-color)" strokeWidth="3"
        strokeDasharray="8 6" markerEnd="url(#atk-arrow)" />
    </svg>
  );
};

const btn = (bg = "var(--border-color)") => ({
  background: bg, color: "#fff", border: "1px solid var(--border-color-dark)", borderRadius: "var(--radius-sm)",
  fontSize: "0.85rem", padding: "6px 12px", minHeight: "38px", cursor: "pointer",
});

const bar = {
  position: "fixed", left: "8px", right: "62px", top: "46px", zIndex: 8100,
  background: "rgba(20,20,20,0.96)", border: "1px solid var(--danger-color)", borderRadius: "var(--radius-md)",
  padding: "8px", color: "#fff", fontSize: "0.85rem", display: "flex", alignItems: "center",
  justifyContent: "space-between", gap: "8px", flexWrap: "wrap", boxShadow: "0 4px 14px rgba(0,0,0,0.7)",
};

export const AttackUI = ({
  attack, draggingCard, dragPos, shieldCount,
  onAttackPlayer, onCancel, onAnswer, onFinishResolve, onSetCount, onTogglePick, onBreak, onSkipBreak, onPreBreak, onEndPreBreak,
}) => {
  // ドラッグ中(上スワイプ中)の点線
  let line = null;
  if (draggingCard && !draggingCard.data.isOpponent && draggingCard.data.zone === "battle") {
    // 指の下が相手クリーチャーなら、その中心へ矢印を吸着させる
    const under = document.elementFromPoint(dragPos.x, dragPos.y);
    const oppEl = under?.closest('[data-zone-id^="opponent-"]');
    let to = dragPos;
    if (oppEl) {
      const cardEl = oppEl.getAttribute("data-zone-id") === "opponent-battle" ? under.closest("[data-index]") : null;
      to = (cardEl ? centerOf(targetSelector({ type: "creature", index: cardEl.getAttribute("data-index") })) : centerOf(targetSelector({ type: "player" }))) || dragPos;
    }
    line = <Line from={centerOf(attackerSelector(draggingCard.data.index))} to={to} />;
  } else if (attack) {
    const from = centerOf(attackerSelector(attack.idx));
    const to = attack.target
      ? centerOf(targetSelector(attack.target))
      : centerOf(`[data-zone-id="opponent-shield"]`);
    line = <Line from={from} to={to} />;
  }

  if (!attack) return line;
  const label = attack.target?.type === "player" ? "プレイヤー" : "クリーチャー";

  return (
    <>
      {line}
      {attack.phase === "target" && (
        <div style={bar}>
          <span>攻撃対象を選択:相手クリーチャーをタップ</span>
          <span style={{ display: "flex", gap: "6px" }}>
            <button style={btn("var(--danger-color)")} onClick={onAttackPlayer}>プレイヤー</button>
            <button style={btn("var(--border-color-dark)")} onClick={onCancel}>取消</button>
          </span>
        </div>
      )}

      {attack.phase === "confirm" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 8200, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--surface-color-dark)", border: "1px solid var(--danger-color)", borderRadius: "var(--radius-lg)", padding: "16px", color: "#fff", textAlign: "center", maxWidth: "80%" }}>
            <div style={{ marginBottom: "4px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}を攻撃</div>
            <div style={{ marginBottom: "12px" }}>攻撃時能力を解決しますか?</div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button style={btn("var(--danger-color)")} onClick={() => onAnswer(true)}>はい</button>
              <button style={btn()} onClick={() => onAnswer(false)}>いいえ</button>
            </div>
          </div>
        </div>
      )}

      {attack.phase === "resolving" && (
        <div style={bar}>
          <span>⚔ 攻撃時能力を解決中(自由に操作できます)</span>
          <button style={btn("var(--danger-color)")} onClick={onFinishResolve}>処理終了</button>
        </div>
      )}

      {attack.phase === "prebreak" && (
        <div style={bar}>
          <span>⚔ ブレイク前の効果を解決中(自由に操作できます)</span>
          <button style={btn("var(--danger-color)")} onClick={onEndPreBreak}>処理終了</button>
        </div>
      )}

      {attack.phase === "break" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 8200, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--surface-color-dark)", border: "1px solid var(--danger-color)", borderRadius: "var(--radius-lg)", padding: "12px", color: "#fff", width: "min(92%, 460px)", maxHeight: "88vh", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <b>シールドブレイク</b>
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>ブレイク数</span>
                <button style={btn()} disabled={attack.count <= 1} onClick={() => onSetCount(attack.count - 1)}>−</button>
                <b style={{ minWidth: "24px", textAlign: "center", fontSize: "1.1rem" }}>{attack.count}</b>
                <button style={btn()} disabled={attack.count >= shieldCount} onClick={() => onSetCount(attack.count + 1)}>＋</button>
              </span>
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
              ブレイクするシールドをタップ({attack.picks.length}/{Math.min(attack.count, shieldCount)}枚)
            </div>
            <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", alignContent: "start" }}>
              {Array.from({ length: shieldCount }, (_, i) => {
                const n = attack.picks.indexOf(i);
                return (
                  <div key={i} onClick={() => onTogglePick(i)} style={{ position: "relative", cursor: "pointer" }}>
                    <img src="/card_back.jpg" style={{ width: "100%", display: "block", borderRadius: "var(--radius-sm)", border: n >= 0 ? "3px solid var(--danger-color)" : "1px solid var(--border-color-dark)", opacity: n >= 0 ? 1 : 0.85 }} />
                    <span style={{ position: "absolute", left: 2, bottom: 2, fontSize: "0.65rem", background: "rgba(0,0,0,0.7)", borderRadius: "8px", padding: "0 5px" }}>{i + 1}</span>
                    {n >= 0 && <span style={{ position: "absolute", top: 2, right: 2, minWidth: "18px", height: "18px", borderRadius: "9px", background: "var(--danger-color)", fontSize: "0.7rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center" }}>{n + 1}</span>}
                  </div>
                );
              })}
            </div>
            <span style={{ display: "flex", gap: "6px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button style={btn("var(--warning-color)")} onClick={onPreBreak}>ブレイク前効果</button>
              <button style={btn("var(--danger-color)")} disabled={!attack.picks.length} onClick={onBreak}>ブレイク</button>
              <button style={btn("var(--border-color-dark)")} onClick={onSkipBreak}>ブレイクしない</button>
            </span>
          </div>
        </div>
      )}
    </>
  );
};
