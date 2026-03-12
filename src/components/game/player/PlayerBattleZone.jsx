import { DraggableCard } from "../DraggableCard";
import { CardView } from "../CardView";
import { getProxyImageUrl } from "../../../utils/apiConfig";

export const PlayerBattleZone = ({ battleZone, grZone = [], selectedCard, onZoneTap, onViewMode, getDragProps }) => {
  return (
    <div style={{ display: "flex", marginTop: "15px" }}>
      {/* バトルゾーン */}
      <div
        className="zone-scroll"
        data-zone-id="battle"
        onClick={() => onZoneTap("battle")}
        style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", alignContent: "flex-start", flexWrap: "wrap", gap: "4px", padding: "10px", borderBottom: "1px dashed #222", position: "relative", minHeight: "100px", flex: 1 }}
      >
         {battleZone.length === 0 && <span style={{fontSize:"0.8rem", color:"#333"}}>Battle Zone</span>}
         {battleZone.map((card, i) => (
           <DraggableCard key={card.id || i} {...getDragProps("battle", i, card)} style={{position:"relative"}} data-index={i}>
             <div>
               <CardView url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} isSelected={selectedCard?.data === card}
                 onClick={() => {}} style={{ width: "60px" }} />
               {card.stack && card.stack.length > 0 && (
                 <div style={{position:"absolute", top:-5, right:-5, background:"#d32f2f", color:"white", borderRadius:"50%", width:"18px", height:"18px", fontSize:"0.7rem", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid white", pointerEvents:"none"}}>
                   {card.stack.length + 1}
                 </div>
               )}
             </div>
           </DraggableCard>
         ))}
      </div>

      {/* GRゾーン - GRカードがある時のみ表示 */}
      {grZone.length > 0 && (
        <div
          data-zone-id="grZone"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px", borderLeft: "1px dashed #4caf50", minWidth: "55px" }}
        >
          <DraggableCard {...getDragProps("grZone", 0, grZone.length > 0 ? { url: grZone[0] } : {})} style={{ height: "63px" }}>
            <div
              onClick={() => onViewMode("grZone")}
              style={{ width: "45px", height: "63px", border: "1px dashed #4caf50", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", background: "#0a1a0a" }}
            >
              <img src="/card_back.jpg" style={{ width: "100%", height: "100%", opacity: 0.6, borderRadius: "3px" }} />
              <span style={{ position: "absolute", fontSize: "0.55rem", color: "#4caf50", fontWeight: "bold" }}>GR</span>
            </div>
          </DraggableCard>
          <span style={{ fontSize: "0.55rem", color: "#4caf50", marginTop: "2px" }}>{grZone.length}</span>
          <button
            onClick={() => onViewMode("grZone")}
            style={{ marginTop: "2px", background: "none", border: "1px solid #4caf50", color: "#4caf50", fontSize: "0.55rem", padding: "1px 4px", borderRadius: "3px", cursor: "pointer" }}
          >
            👁
          </button>
        </div>
      )}
    </div>
  );
};
