import { useState } from "react";
import { getProxyImageUrl } from "../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

// 複数選択の移動先
const MULTI_TARGETS = [
  { id: "hand", label: "手札" }, { id: "mana", label: "マナ" }, { id: "battle", label: "バトル" },
  { id: "shield", label: "シールド" }, { id: "grave", label: "墓地" }, { id: "temp", label: "一時" },
  { id: "hyperspace", label: "超次元" }, { id: "deckTop", label: "山上" }, { id: "deckBottom", label: "山下" },
];

export const ZoneModal = ({ title, cards, zoneName, selectedCard, onClose, onCardTap, onToggleFace, onMoveMany }) => {
  const [multi, setMulti] = useState(false);
  const [picked, setPicked] = useState([]); // 触った順のインデックス

  const togglePick = (i) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const toggleMulti = () => { setMulti((m) => !m); setPicked([]); };
  const moveMany = (target) => {
    if (!picked.length) return;
    onMoveMany(zoneName, picked, target);
    setPicked([]);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 3000, pointerEvents: "none" }}>
      
      <div style={{ 
        position: "absolute", top: "10%", left: "5%", right: "5%", bottom: "35%", 
        background: "rgba(30, 30, 30, 0.95)", border: "2px solid var(--purple-color)", borderRadius: "var(--radius-lg)",
        display: "flex", flexDirection: "column", padding: "15px", boxSizing: "border-box",
        pointerEvents: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.8)"
      }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", color: "white" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{title} ({cards.length})</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            {onMoveMany && (
              <button className="btn" onClick={toggleMulti} style={{background: multi ? "var(--accent-color)" : "var(--border-color)", fontSize: "0.75rem", padding: "4px 8px"}}>
                {multi ? "複数選択中" : "複数選択"}
              </button>
            )}
            {zoneName === "temp" && (
              <button className="btn" onClick={onToggleFace} style={{background: "var(--accent-color)", fontSize: "0.75rem", padding: "4px 8px"}}>
                公開/非公開
              </button>
            )}
            <button className="btn" onClick={onClose} style={{background: "var(--border-color-dark)", fontSize: "0.75rem", padding: "4px 8px"}}>閉じる</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", alignContent: "start", paddingRight: "5px" }}>
          {cards.map((item, i) => {
            const url = typeof item === 'object' ? item.url : item;
            const isFaceDown = typeof item === 'object' ? item.isFaceDown : false;

            const faces = typeof item === 'object' ? item.faces : null;
            const hasFaces = faces && Array.isArray(faces) && faces.length > 1;

            return (
              <div key={i} onClick={(e) => (multi ? togglePick(i) : onCardTap(e, zoneName, i, item))} style={{ position: "relative" }}>
                 <img src={getProxyImageUrl(url)} style={{
                   width: "100%", borderRadius: "var(--radius-sm)", display: "block",
                   border: picked.includes(i) ? "2px solid var(--accent-color)" : (!multi && selectedCard?.zone === zoneName && selectedCard?.index === i) ? "2px solid yellow" : "1px solid var(--border-color-dark)",
                   filter: isFaceDown ? "grayscale(50%) brightness(0.7)" : "none"
                 }} />

                 {/* 選択順バッジ */}
                 {picked.includes(i) && (
                   <div style={{ position: "absolute", top: 2, left: 2, minWidth: "20px", height: "20px", borderRadius: "var(--radius-pill)", background: "var(--accent-color)", color: "#fff", fontSize: "0.75rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                     {picked.indexOf(i) + 1}
                   </div>
                 )}

                 {/* 複数面バッジ */}
                 {hasFaces && (
                   <div className="badge badge-faces" style={{ top: 2, right: 2, width: "18px", height: "18px", fontSize: "0.65rem" }}>
                     {faces.length}
                   </div>
                 )}

                 {isFaceDown && (
                   <div style={{
                     position:"absolute", top:0, left:0, width:"100%", height:"100%",
                     display:"flex", alignItems:"center", justifyContent:"center",
                     color:"white", fontWeight:"bold", textShadow:"0 0 3px black",
                     pointerEvents: "none"
                   }}>
                     🔒
                   </div>
                 )}
              </div>
            );
          })}
        </div>
        
        {multi ? (
          <div style={{ marginTop: "8px" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center", marginBottom: "6px" }}>
              触った順に番号が付きます({picked.length}枚) → 移動先をタップ
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
              {MULTI_TARGETS.filter((t) => t.id !== zoneName).map((t) => (
                <button key={t.id} className="btn" disabled={!picked.length} onClick={() => moveMany(t.id)}
                  style={{ fontSize: "0.8rem", padding: "6px 10px", minHeight: "36px", opacity: picked.length ? 1 : 0.4 }}>
                  {t.label}へ
                </button>
              ))}
              {picked.length > 0 && (
                <button className="btn" onClick={() => setPicked([])} style={{ fontSize: "0.8rem", padding: "6px 10px", minHeight: "36px", background: "var(--border-color-dark)" }}>選択解除</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "8px", color: "var(--text-secondary)", fontSize: "0.75rem", textAlign: "center" }}>
            {zoneName === "temp" ? "山札タップで追加 / 公開ボタンで切替" : "カードを選択 → 移動先をタップ"}
          </div>
        )}
      </div>
    </div>
  );
};
