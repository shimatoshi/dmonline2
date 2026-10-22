import { useState } from "react";
// 盤面の複数選択中に出る操作パネル。選んだ順にまとめて移動・寝起き・伏せ公開を行う。
const TARGETS = [
  { id: "hand", label: "手札" }, { id: "mana", label: "マナ" }, { id: "battle", label: "バトル" },
  { id: "shield", label: "シールド" }, { id: "grave", label: "墓地" }, { id: "temp", label: "一時" },
  { id: "hyperspace", label: "超次元" }, { id: "deckTop", label: "山上" }, { id: "deckBottom", label: "山下" },
];

const btn = (bg = "var(--border-color)") => ({
  background: bg, color: "#fff", border: "1px solid var(--border-color-dark)", borderRadius: "var(--radius-sm)",
  fontSize: "0.8rem", padding: "6px 10px", minHeight: "36px", cursor: "pointer",
});

export const MultiActionPanel = ({ picked, onMove, onToggleStatus, onClear, onExit }) => {
  const [atBottom, setAtBottom] = useState(false); // 既定は画面上側(自分の盤面を隠さない)
  const canStatus = picked.length > 0 && picked.every((p) => p.zone === "battle" || p.zone === "mana");

  return (
    <div
      style={{
        position: "fixed", left: "8px", right: "62px", ...(atBottom ? { bottom: "8px" } : { top: "48px" }), zIndex: 3500, maxHeight: "40vh", overflowY: "auto",
        background: "rgba(20,20,20,0.96)", border: "1px solid var(--accent-color)", borderRadius: "var(--radius-md)",
        padding: "8px", display: "flex", flexDirection: "column", gap: "6px", boxShadow: "0 4px 14px rgba(0,0,0,0.7)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", fontSize: "0.8rem" }}>
        <span>複数選択 {picked.length}枚 <span style={{ color: "var(--text-secondary)" }}>(触った順に移動)</span></span>
        <span style={{ display: "flex", gap: "6px" }}>
          <button onClick={() => setAtBottom((b) => !b)} style={btn()}>{atBottom ? "▲上へ" : "▼下へ"}</button>
          {picked.length > 0 && <button onClick={onClear} style={btn("var(--border-color-dark)")}>解除</button>}
          <button onClick={onExit} style={btn("var(--danger-color)")}>終了</button>
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
        {TARGETS.map((t) => (
          <button key={t.id} disabled={!picked.length} onClick={() => onMove(t.id)} style={{ ...btn(), opacity: picked.length ? 1 : 0.4 }}>
            {t.label}へ
          </button>
        ))}
        {canStatus && (
          <>
            <button onClick={() => onToggleStatus("tap")} style={btn("var(--accent-color)")}>寝/起</button>
            <button onClick={() => onToggleStatus("face")} style={btn("var(--accent-color)")}>伏せ/公開</button>
          </>
        )}
      </div>
    </div>
  );
};
