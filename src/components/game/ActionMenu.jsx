export const ActionMenu = ({ selectedCard, onZoom, onMove, onToggleStatus, onShuffle, onShowStack, onChangeFace, onClose }) => {
  if (!selectedCard) return null;
  const { zone, data } = selectedCard;
  const hasStack = data.stack && data.stack.length > 0;
  const hasFaces = data.faces && Array.isArray(data.faces) && data.faces.length > 1;

  return (
    <div style={{ 
       position: "absolute", top: "52%", left: "50%", transform: "translateX(-50%)", 
       zIndex: 3500, 
       display: "flex", gap: "8px", background: "rgba(0,0,0,0.95)", padding: "8px 12px", borderRadius: "8px",
       boxShadow: "0 4px 15px rgba(0,0,0,0.8)", border: "1px solid #007bff", whiteSpace: "nowrap"
     }}>
       <button onClick={() => onZoom(data.url || data)} style={{background:"none", border:"none", fontSize:"1.2rem"}}>🔍</button>
       
       <div style={{width:"1px", background:"#555"}}></div>
       
       {/* 重なり確認ボタン */}
       {hasStack && (
         <>
           <button onClick={() => onShowStack(data)} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#17a2b8", color:"white"}}>
             ≡ 重なり({data.stack.length})
           </button>
           <div style={{width:"1px", background:"#555"}}></div>
         </>
       )}

       {/* 山札専用 */}
       {zone === "deck" && (
         <>
           <button onClick={() => onMove("temp")} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#6f42c1", color:"white"}}>一時ゾーンへ</button>
           <button onClick={onShuffle} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#28a745", color:"white"}}>🔀 シャッフル</button>
           <div style={{width:"1px", background:"#555"}}></div>
         </>
       )}

       {/* 超次元チェンジボタン */}
       {hasFaces && (zone === "battle" || zone === "hyperspace") && (
         <>
           <button onClick={() => onChangeFace(data)} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#00bfff", color:"white", fontWeight:"bold"}}>
             チェンジ
           </button>
           <div style={{width:"1px", background:"#555"}}></div>
         </>
       )}

       {/* 移動ボタン (常に表示) */}
       <button onClick={() => onMove("deckTop")} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#333", color:"white"}}>山札上</button>
       <button onClick={() => onMove("deckBottom")} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#333", color:"white"}}>山札下</button>

       {/* 状態変更ボタン */}
       {(zone === "battle" || zone === "mana" || zone === "temp") && (
         <>
           <div style={{width:"1px", background:"#555"}}></div>
           {zone !== "temp" && (
             <button onClick={() => onToggleStatus("tap")} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#333", color:"white"}}>
                {data.isTapped ? "起" : "寝"}
             </button>
           )}
           <button onClick={() => onToggleStatus("face")} className="btn" style={{padding:"4px 8px", fontSize:"0.75rem", background: "#333", color:"white"}}>
              {data.isFaceDown ? "公開" : "伏せ"}
           </button>
         </>
       )}
       
       <div style={{width:"1px", background:"#555"}}></div>
       <button onClick={onClose} style={{background:"none", border:"none", color:"#ff6b6b", fontWeight:"bold"}}>✕</button>
     </div>
  );
};
