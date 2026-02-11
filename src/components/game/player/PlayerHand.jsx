import { DraggableCard } from "../DraggableCard";
import { getProxyImageUrl } from "../../../utils/apiConfig";

export const PlayerHand = ({ hand, selectedCard, onZoneTap, getDragProps }) => {
  return (
    <div 
      className="zone-scroll"
      data-zone-id="hand"
      onClick={() => onZoneTap("hand")}
      style={{ 
        minHeight: "90px", 
        background: "#0a0a0a", 
        display: "flex", 
        flexWrap: "wrap", // 折り返し
        alignItems: "center", 
        justifyContent: "center", // 中央寄せ
        padding: "10px", 
        gap: "5px", 
        borderTop: "1px solid #333",
        transform: "rotate(180deg)",
        direction: "rtl"
      }}
    >
       {[...hand].map((url, i) => ({url, i})).map(({url, i}) => (
         <DraggableCard key={i} {...getDragProps("hand", i, { url })} style={{ width: "60px", height: "84px", flexShrink: 0, transform: "rotate(180deg)" }}>
           <div style={{ height: "100%", position: "relative" }}>
              <img src={getProxyImageUrl(url)} style={{ 
                  width: "100%", height: "100%", borderRadius: "4px", border: "1px solid #555", cursor: "pointer",
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
