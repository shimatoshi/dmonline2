import { DraggableCard } from "../DraggableCard";
import { CardView } from "../CardView";

export const PlayerBattleZone = ({ battleZone, selectedCard, onZoneTap, getDragProps }) => {
  return (
    <div 
      className="zone-scroll"
      data-zone-id="battle"
      onClick={() => onZoneTap("battle")}
      style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", alignContent: "flex-start", flexWrap: "wrap", gap: "4px", padding: "10px", borderBottom: "1px dashed #222", position: "relative", marginTop: "15px", overflowY: "auto" }}
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
  );
};
