import { CardView } from "./CardView";
import { getProxyImageUrl } from "../../utils/apiConfig";
const CARD_BACK_URL = "/card_back.jpg";

export const OpponentArea = ({ opponent, normalizeZone, onZoom, interactionMode, onOpponentInteract }) => {
  return (
    <div style={{ flex: 1, borderBottom: "1px solid #333", background: "#151515", display: "flex", flexDirection: "column", position: "relative" }}>
      
      {/* モード表示 */}
      {interactionMode && (
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", 
          zIndex: 50, background: "rgba(220, 53, 69, 0.9)",
          color: "white", fontWeight: "bold", padding: "5px 15px", borderRadius: "20px", pointerEvents: "none",
          fontSize: "0.8rem", width: "80%", textAlign: "center"
        }}>
          相手のカードをタップして操作を選択
        </div>
      )}

      <div style={{ padding: "5px", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
         {/* 手札 */}
         <div style={{ display: "flex", gap: "2px", marginBottom: "2px" }}>
            {[...Array(opponent?.hand?.length || 0)].map((_, i) => (
              <img key={i} src={CARD_BACK_URL} style={{ width: "30px", height: "42px", borderRadius: "2px" }} />
            ))}
         </div>
         {/* マナ (干渉可能) */}
         <div style={{ display: "flex", gap: "2px", height: "40px", alignItems: "center", transform: "rotate(180deg)" }}>
            {normalizeZone(opponent?.manaZone).map((card, i) => (
              <CardView 
                key={i} url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} 
                onClick={() => interactionMode ? onOpponentInteract("mana", i) : onZoom(card.url)} 
                style={{ height: "35px", width: "25px", flexShrink: 0, cursor: interactionMode ? "pointer" : "default", boxShadow: interactionMode ? "0 0 5px red" : "none" }} 
              />
            ))}
         </div>
      </div>
      
      {/* ミドルエリア */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center", padding: "5px", transform: "rotate(180deg)" }}>
          <div style={{ width: "40px", height: "56px", border: "1px dashed #444", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center" }}>
             {opponent?.graveyard?.length > 0 ? <img src={getProxyImageUrl(opponent.graveyard[opponent.graveyard.length-1])} style={{width:"100%", height:"100%"}} /> : <span style={{fontSize:"0.5rem", color:"#555"}}>墓</span>}
          </div>
          
          {opponent?.tempZone?.length > 0 && (
            <div style={{ width: "40px", height: "56px", border: "2px solid #6f42c1", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", background: "#222", position: "relative" }}>
               {(() => {
                 const topCard = opponent.tempZone[opponent.tempZone.length - 1];
                 const isFaceDown = (typeof topCard === 'object') ? topCard.isFaceDown : false;
                 const url = (typeof topCard === 'object') ? topCard.url : topCard;
                 return <img src={isFaceDown ? CARD_BACK_URL : getProxyImageUrl(url)} style={{width:"100%", height:"100%"}} />;
               })()}
               <span style={{position:"absolute", bottom:0, right:0, background:"black", color:"white", fontSize:"0.6rem"}}>{opponent.tempZone.length}</span>
            </div>
          )}

          {/* 盾 (干渉可能) */}
          <div style={{ display: "flex", gap: "3px" }}>
             {[...Array(opponent?.shields?.length || 0)].map((_, i) => (
               <div key={i} onClick={() => interactionMode && onOpponentInteract("shield", i)}>
                 <img src={CARD_BACK_URL} style={{ 
                   width: "32px", height: "45px", borderRadius: "2px", border: "1px solid #b8860b",
                   boxShadow: interactionMode ? "0 0 5px red" : "none",
                   cursor: interactionMode ? "pointer" : "default"
                 }} />
               </div>
             ))}
          </div>
          <div style={{ width: "40px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
             {opponent?.deck?.length > 0 ? <img src={CARD_BACK_URL} style={{width:"100%", height:"100%"}} /> : <span style={{fontSize:"0.5rem", color:"#555"}}>山</span>}
          </div>
      </div>

      {/* バトルゾーン (干渉可能) */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: "2px", transform: "rotate(180deg)", padding: "10px", borderTop: "1px dashed #333" }}>
         {normalizeZone(opponent?.battleZone).map((card, i) => (
           <CardView 
             key={i} url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} 
             onClick={() => interactionMode ? onOpponentInteract("battle", i) : onZoom(card.url)} 
             style={{ 
               width: "55px", 
               boxShadow: interactionMode ? "0 0 5px red" : "none",
               cursor: interactionMode ? "pointer" : "default"
             }} 
           />
         ))}
      </div>
    </div>
  );
};
