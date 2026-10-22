import { DraggableCard } from "../DraggableCard";
import { getProxyImageUrl } from "../../../utils/apiConfig";

export const PlayerHand = ({ hand, selectedCard, onZoneTap, getDragProps }) => {
  return (
    <div 
      className="zone-scroll"
      data-zone-id="hand"
      onClick={() => onZoneTap("hand")}
      style={{ 
        flexShrink: 0, 
        background: "#0a0a0a", 
        display: "flex", 
        flexWrap: "nowrap",
        alignItems: "center", 
        overflowX: "auto", // 枚数が多いときは潰さず横スクロール
        padding: "3px 6px", 
        gap: "2px", 
        borderTop: "1px solid #333",
      }}
    >
       {[...hand].map((url, i) => ({url, i})).map(({url, i}) => (
         <DraggableCard key={i} {...getDragProps("hand", i, { url })} style={{ flex: "0 0 46px", height: "64px", overflow: "hidden", marginLeft: i === 0 ? "auto" : 0, marginRight: i === hand.length - 1 ? "auto" : 0 }}>
           <div style={{ height: "100%", position: "relative" }}>
              <img src={getProxyImageUrl(url)} style={{ 
                  width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top", borderRadius: "4px", border: "1px solid #555", cursor: "pointer",
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
