import { DraggableCard } from "../DraggableCard";
import { CardView } from "../CardView";

export const PlayerManaZone = ({ manaZone, selectedCard, onZoneTap, getDragProps }) => {
  return (
    <div 
      className="zone-scroll"
      data-zone-id="mana"
      onClick={() => onZoneTap("mana")}
      style={{ 
        minHeight: "55px", 
        background: "#151515", 
        display: "flex", 
        flexWrap: "wrap", // 折り返し
        alignItems: "center", 
        justifyContent: "center", // 中央寄せ
        padding: "5px 10px", 
        gap: "2px", 
        borderTop: "1px solid #222",
        transform: "rotate(180deg)",
        direction: "rtl"
      }}
    >
       {[...manaZone].map((card, i) => ({card, i})).map(({card, i}) => (
         <DraggableCard key={card.id || i} {...getDragProps("mana", i, card)} style={{ transform: "rotate(180deg)" }}>
           <CardView url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} isSelected={selectedCard?.data === card}
             onClick={() => {}} style={{ height: "45px", width: "32px", flexShrink: 0, marginRight: card.isTapped ? "12px" : "2px", marginBottom: "2px" }} />
         </DraggableCard>
       ))}
    </div>
  );
};
