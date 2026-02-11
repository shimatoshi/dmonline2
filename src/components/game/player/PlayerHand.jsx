import { DraggableCard } from "../DraggableCard";
import { getProxyImageUrl } from "../../../utils/apiConfig";

export const PlayerHand = ({ hand, selectedCard, onZoneTap, getDragProps }) => {
  return (
    <div 
      className="zone-scroll"
      data-zone-id="hand"
      onClick={() => onZoneTap("hand")}
      style={{ 
        height: "90px", 
        background: "#0a0a0a", 
        display: "flex", 
        alignItems: "center", 
        overflowX: "auto", 
        padding: "5px 10px", 
        gap: "5px", 
        borderTop: "1px solid #333",
        transform: "rotate(180deg)",
        direction: "rtl"
      }}
    >
       {[...hand].map((url, i) => ({url, i})).map(({url, i}) => (
         <DraggableCard key={i} {...getDragProps("hand", i, { url })} style={{ height: "100%", flexShrink: 0, transform: "rotate(180deg)" }}>
           <div style={{ height: "100%", position: "relative" }}>
              <img src={getProxyImageUrl(url)} style={{ 
                  height: "100%", borderRadius: "4px", border: "1px solid #555", cursor: "pointer",
                  boxShadow: selectedCard?.zone === "hand" && selectedCard?.index === i ? "0 0 0 3px yellow" : "none",
                  transform: selectedCard?.zone === "hand" && selectedCard?.index === i ? "translateY(10px)" : "none",
                  transition: "transform 0.1s"
                }} 
              />
           </div>
         </DraggableCard>
       ))}
    </div>
  );
};
