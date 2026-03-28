export const ActionMenu = ({ selectedCard, onZoom, onMove, onToggleStatus, onShuffle, onShowStack, onChangeFace, onClose }) => {
  if (!selectedCard) return null;
  const { zone, data } = selectedCard;
  const hasStack = data.stack && data.stack.length > 0;
  const hasFaces = data.faces && Array.isArray(data.faces) && data.faces.length > 1;

  const menuBtn = { padding: "4px 8px", fontSize: "0.75rem" };

  return (
    <div className="modal-center" style={{ top: "52%", transform: "translateX(-50%)", zIndex: 3500, display: "flex", gap: "8px", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--accent-color)", whiteSpace: "nowrap" }}>
       <button onClick={() => onZoom(data.url || data)} style={{ background: "none", border: "none", fontSize: "1.2rem" }}>🔍</button>
       <div className="separator-v"></div>

       {hasStack && (
         <>
           <button onClick={() => onShowStack(data)} className="btn" style={{ ...menuBtn, background: "#17a2b8", color: "white" }}>
             ≡ 重なり({data.stack.length})
           </button>
           <div className="separator-v"></div>
         </>
       )}

       {zone === "deck" && (
         <>
           <button onClick={() => onMove("temp")} className="btn" style={{ ...menuBtn, background: "var(--purple-color)", color: "white" }}>一時ゾーンへ</button>
           <button onClick={onShuffle} className="btn" style={{ ...menuBtn, background: "var(--success-color)", color: "white" }}>🔀 シャッフル</button>
           <div className="separator-v"></div>
         </>
       )}

       {hasFaces && (zone === "battle" || zone === "hyperspace") && (
         <>
           <button onClick={() => onChangeFace(data)} className="btn" style={{ ...menuBtn, background: "var(--info-color)", color: "white", fontWeight: "bold" }}>
             チェンジ
           </button>
           <div className="separator-v"></div>
         </>
       )}

       <button onClick={() => onMove("deckTop")} className="btn" style={{ ...menuBtn, background: "var(--border-color)", color: "white" }}>山札上</button>
       <button onClick={() => onMove("deckBottom")} className="btn" style={{ ...menuBtn, background: "var(--border-color)", color: "white" }}>山札下</button>

       {(zone === "battle" || zone === "mana" || zone === "temp") && (
         <>
           <div className="separator-v"></div>
           {zone !== "temp" && (
             <button onClick={() => onToggleStatus("tap")} className="btn" style={{ ...menuBtn, background: "var(--border-color)", color: "white" }}>
                {data.isTapped ? "起" : "寝"}
             </button>
           )}
           <button onClick={() => onToggleStatus("face")} className="btn" style={{ ...menuBtn, background: "var(--border-color)", color: "white" }}>
              {data.isFaceDown ? "公開" : "伏せ"}
           </button>
         </>
       )}

       <div className="separator-v"></div>
       <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--danger-light)", fontWeight: "bold" }}>✕</button>
     </div>
  );
};
