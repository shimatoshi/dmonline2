import { CardView } from "./CardView";
import { getProxyImageUrl } from "../../utils/apiConfig";
const CARD_BACK_URL = "/card_back.jpg";

export const PlayerArea = ({ 
  hand, battleZone, manaZone, shields, graveyard, deck, tempZone,
  selectedCard, interactionMode,
  onZoneTap, onCardTap, onDraw, onViewMode, 
  onSetup, onStartTurn, onShuffle, onSetInteractionMode
}) => {
  return (
    <div style={{ flex: 1.2, display: "flex", flexDirection: "column", background: "#0a0a0a", position: "relative" }}>
      
      {/* 左上：セットアップ */}
      <div style={{ position: "absolute", top: "-18px", left: "10px", zIndex: 10 }}>
         <button className="btn btn-success" onClick={onSetup} style={{ fontSize: "0.75rem", padding: "4px 8px", boxShadow: "0 2px 4px black", border: "1px solid #28a745" }}>🎲 セットアップ</button>
      </div>

      {/* 右上：アクションボタン群 */}
      <div style={{ position: "absolute", top: "-18px", right: "10px", zIndex: 10, display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
         <div style={{display: "flex", gap: "5px"}}>
            {/* ★統合された干渉ボタン */}
            <button 
              className="btn" onClick={() => onSetInteractionMode(!interactionMode)} 
              style={{ 
                fontSize: "0.75rem", padding: "4px 8px", boxShadow: "0 2px 4px black", 
                background: interactionMode ? "#dc3545" : "#333", 
                color: "white", border: interactionMode ? "1px solid #ffaaaa" : "1px solid #555" 
              }}
            >
              {interactionMode ? "干渉中..." : "⚡ 相手に干渉"}
            </button>
            
            <button className="btn btn-primary" onClick={onStartTurn} style={{ fontSize: "0.75rem", padding: "4px 8px", boxShadow: "0 2px 4px black" }}>⚡ ターン開始</button>
         </div>
         
         <div style={{ display: "flex", gap: "5px" }}>
           <button className="btn" onClick={onShuffle} style={{ fontSize: "0.75rem", padding: "4px 8px", background: "#28a745", color: "white", boxShadow: "0 2px 4px black", border: "1px solid #1e7e34" }}>
             🔀 シャッフル
           </button>
           <button className="btn" onClick={() => onViewMode("temp")} style={{ fontSize: "0.75rem", padding: "4px 8px", background: "#6f42c1", color: "white", boxShadow: "0 2px 4px black", border: "1px solid #5936a2" }}>
             一時ゾーン ({tempZone.length})
           </button>
         </div>
      </div>

      {/* バトルゾーン */}
      <div 
        onClick={() => onZoneTap("battle")}
        style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "4px", padding: "10px", borderBottom: "1px dashed #222", position: "relative", marginTop: "15px" }}
      >
         {battleZone.length === 0 && <span style={{fontSize:"0.8rem", color:"#333"}}>Battle Zone</span>}
         {battleZone.map((card, i) => (
           <div key={card.id || i} style={{position:"relative"}}>
             <CardView url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} isSelected={selectedCard?.data === card}
               onClick={(e) => onCardTap(e, "battle", i, card)} style={{ width: "60px", cursor: "pointer" }} />
             {card.stack && card.stack.length > 0 && (
               <div style={{position:"absolute", top:-5, right:-5, background:"#d32f2f", color:"white", borderRadius:"50%", width:"18px", height:"18px", fontSize:"0.7rem", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid white", pointerEvents:"none"}}>
                 {card.stack.length + 1}
               </div>
             )}
           </div>
         ))}
      </div>

      {/* ミドルエリア */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center", padding: "5px 10px", background: "#111" }}>
          
          {/* 墓地 */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
            <div 
              onClick={() => onZoneTap("grave")} 
              style={{ width: "45px", height: "63px", border: "1px dashed #444", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              {graveyard.length > 0 ? 
                <img src={getProxyImageUrl(graveyard[graveyard.length-1])} style={{width:"100%", height:"100%", opacity:0.8}} /> : 
                <span style={{fontSize:"0.6rem", color:"#555"}}>墓 {graveyard.length}</span>
              }
            </div>
            <button 
              onClick={() => onViewMode("grave")}
              style={{ marginTop: "4px", background: "none", border: "1px solid #444", color: "#aaa", fontSize: "0.6rem", padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}
            >
              👀見る
            </button>
          </div>

          {/* シールド */}
          <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
             {shields.map((s, i) => (
               <div key={i} onClick={(e) => onCardTap(e, "shield", i, s)} style={{ width: "36px", height: "50px", cursor: "pointer" }}>
                  <img src={CARD_BACK_URL} style={{ width: "100%", height: "100%", borderRadius: "3px", border: "1px solid #b8860b", boxShadow: selectedCard?.zone === "shield" && selectedCard?.index === i ? "0 0 0 2px yellow" : "none" }} />
               </div>
             ))}
          </div>

          {/* 山札 */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
             <div 
               onClick={onDraw}
               style={{ width: "45px", height: "63px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
             >
                {deck.length > 0 ? (
                  <img src={CARD_BACK_URL} style={{width:"100%", height:"100%", borderRadius:"3px"}} />
                ) : <span style={{fontSize:"0.6rem", color:"#555"}}>0</span>}
                <span style={{ position: "absolute", bottom: "-12px", fontSize: "0.6rem", color: "#aaa" }}>山 {deck.length}</span>
             </div>
             <button 
                onClick={() => onViewMode("deck")}
                style={{ marginTop: "12px", background: "none", border: "1px solid #444", color: "#aaa", fontSize: "0.6rem", padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}
             >
               👀見る
             </button>
          </div>
      </div>

      {/* マナゾーン */}
      <div 
        onClick={() => onZoneTap("mana")}
        style={{ height: "55px", background: "#151515", display: "flex", alignItems: "center", overflowX: "auto", padding: "0 10px", gap: "2px", borderTop: "1px solid #222" }}
      >
         {manaZone.map((card, i) => (
           <CardView key={card.id || i} url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} isSelected={selectedCard?.data === card}
             onClick={(e) => onCardTap(e, "mana", i, card)} style={{ height: "45px", width: "32px", flexShrink: 0, cursor: "pointer", marginRight: card.isTapped ? "12px" : "2px" }} />
         ))}
      </div>

      {/* 手札エリア */}
      <div 
        onClick={() => onZoneTap("hand")}
        style={{ height: "90px", background: "#0a0a0a", display: "flex", alignItems: "center", overflowX: "auto", padding: "5px 10px", gap: "5px", borderTop: "1px solid #333" }}
      >
         {hand.map((url, i) => (
           <div key={i} onClick={(e) => onCardTap(e, "hand", i, url)} style={{ height: "100%", flexShrink: 0, position: "relative" }}>
              <img src={getProxyImageUrl(url)} style={{ 
                  height: "100%", borderRadius: "4px", border: "1px solid #555", cursor: "pointer",
                  boxShadow: selectedCard?.zone === "hand" && selectedCard?.index === i ? "0 0 0 3px yellow" : "none",
                  transform: selectedCard?.zone === "hand" && selectedCard?.index === i ? "translateY(-10px)" : "none",
                  transition: "transform 0.1s"
                }} 
              />
           </div>
         ))}
      </div>
    </div>
  );
};
