import { getProxyImageUrl } from "../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

export const ZoneModal = ({ title, cards, zoneName, selectedCard, onClose, onCardTap, onToggleFace }) => {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 3000, pointerEvents: "none" }}>
      
      <div style={{ 
        position: "absolute", top: "10%", left: "5%", right: "5%", bottom: "35%", 
        background: "rgba(30, 30, 30, 0.95)", border: "2px solid #6f42c1", borderRadius: "10px",
        display: "flex", flexDirection: "column", padding: "15px", boxSizing: "border-box",
        pointerEvents: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.8)"
      }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", color: "white" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>{title} ({cards.length})</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            {zoneName === "temp" && (
              <button className="btn" onClick={onToggleFace} style={{background: "#007bff", fontSize: "0.75rem", padding: "4px 8px"}}>
                公開/非公開
              </button>
            )}
            <button className="btn" onClick={onClose} style={{background: "#555", fontSize: "0.75rem", padding: "4px 8px"}}>閉じる</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", alignContent: "start", paddingRight: "5px" }}>
          {cards.map((item, i) => {
            const url = typeof item === 'object' ? item.url : item;
            const isFaceDown = typeof item === 'object' ? item.isFaceDown : false;

            const faces = typeof item === 'object' ? item.faces : null;
            const hasFaces = faces && Array.isArray(faces) && faces.length > 1;

            return (
              <div key={i} onClick={(e) => onCardTap(e, zoneName, i, item)} style={{ position: "relative" }}>
                 <img src={getProxyImageUrl(url)} style={{
                   width: "100%", borderRadius: "4px", display: "block",
                   border: (selectedCard?.zone === zoneName && selectedCard?.index === i) ? "2px solid yellow" : "1px solid #555",
                   filter: isFaceDown ? "grayscale(50%) brightness(0.7)" : "none"
                 }} />

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
        
        <div style={{ marginTop: "8px", color: "#aaa", fontSize: "0.75rem", textAlign: "center" }}>
          {zoneName === "temp" ? "山札タップで追加 / 公開ボタンで切替" : "カードを選択 → 移動先をタップ"}
        </div>
      </div>
    </div>
  );
};
