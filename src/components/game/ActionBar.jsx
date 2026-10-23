import { useEffect, useRef } from "react";
// 盤面右の操作ボタンバー。ゲーム中の全ボタンをここに集約する。
const barBtn = (bg, extra = {}) => ({
  width: "100%", minHeight: "38px", padding: "2px 2px", display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center", gap: "1px", lineHeight: 1.1,
  background: bg, color: "#fff", border: "1px solid var(--border-color-dark)",
  borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.65rem", flexShrink: 0,
  ...extra,
});

const Item = ({ icon, label, count, bg = "var(--border-color)", onClick, disabled, active, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={barBtn(active ? "var(--accent-color)" : bg, { opacity: disabled ? 0.4 : 1, ...style })}
  >
    <span style={{ fontSize: "1.05rem" }}>{icon}</span>
    <span>{label}{count !== undefined ? ` ${count}` : ""}</span>
  </button>
);

const Divider = () => <div style={{ height: "1px", background: "var(--border-color-light)", margin: "2px 0", flexShrink: 0 }} />;

export const ActionBar = ({
  onStartTurn, onEndTurn, onDraw, onShuffle, onUndo, canUndo, onSetup,
  counts, multiMode, onToggleMulti, interactionMode, onToggleInteract, revealHand, onToggleRevealHand,
  onHelp, onLog, onChat, onCount, onEndRoom, onInterrupt, interruptBusy, onSwitchSide, isSolo,
}) => {
  // 入りきらないときも、基本操作のある下側が見える状態から始める
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, []);
  return (
  <div
    ref={ref}
    className="zone-scroll"
    style={{
      width: "54px", flexShrink: 0, boxSizing: "border-box", padding: "4px",
      display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto",
      background: "var(--surface-color-dark)", borderLeft: "1px solid var(--border-color-light)",
    }}
  >
    {/* すべて下寄せ(親指が届く位置)。入りきらないときはスクロール */}
    <Item icon="🔢" label="カウント" onClick={onCount} style={{ marginTop: "auto" }} />
    <Item icon="❓" label="ヘルプ" onClick={onHelp} />
    <Item icon="📜" label="ログ" onClick={onLog} />
    <Item icon="💬" label="チャット" onClick={onChat} />
    {isSolo && <Item icon="👥" label="視点切替" bg="var(--accent-color)" onClick={onSwitchSide} />}
    <Divider />
    <Item icon="🔄" label="開始前" bg="var(--success-color)" onClick={onSetup} />
    <Divider />
    <Item icon="☑" label={multiMode ? "選択中" : "複数選択"} active={multiMode} onClick={onToggleMulti} />
    <Item icon="⚡" label={interactionMode ? "干渉中" : "干渉"} bg={interactionMode ? "var(--danger-color)" : "var(--border-color)"} onClick={onToggleInteract} />
    {interactionMode && (
      <Item icon={revealHand ? "🙈" : "👁"} label={revealHand ? "隠す" : "手札見"} bg={revealHand ? "var(--warning-color)" : "var(--border-color)"} onClick={onToggleRevealHand} />
    )}
    <Divider />
    <Item icon="↩" label="戻す" onClick={onUndo} disabled={!canUndo} />
    <Item icon="🔀" label="混ぜる" onClick={onShuffle} />
    <Item icon="🃏" label="ドロー" bg="var(--success-color)" onClick={onDraw} disabled={counts.deck === 0} />
    <Divider />
    <Item icon="🥷" label="割り込み" bg="var(--purple-color)" onClick={onInterrupt} disabled={interruptBusy} />
    <Item icon="⚡" label="開始" bg="var(--accent-color)" onClick={onStartTurn} />
    <Item icon="🛑" label="終了" bg="var(--danger-color)" onClick={onEndTurn} />
    <Divider />
    <Item icon="🚪" label="部屋終了" bg="var(--danger-color)" onClick={onEndRoom} />
  </div>
  );
};
