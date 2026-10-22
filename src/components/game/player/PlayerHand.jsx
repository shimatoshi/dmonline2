import { useRef } from "react";
import { ListButton } from "../ListButton";
import { DraggableCard } from "../DraggableCard";
import { getProxyImageUrl } from "../../../utils/apiConfig";

export const PlayerHand = ({ hand, selectedCard, onZoneTap, getDragProps, onViewMode, freshIdx = [] }) => {
  const ref = useRef(null);
  const slide = (d) => ref.current?.scrollBy({ left: d, behavior: "smooth" });
  const slideBtn = { flex: "0 0 auto", width: "20px", alignSelf: "stretch", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", padding: 0, fontSize: "0.8rem", cursor: "pointer" };
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, background: "var(--bg-dark)", borderTop: "1px solid var(--border-color)", padding: "0 2px", gap: "2px" }}>
    <ListButton onClick={() => onViewMode("hand")} />
    <button style={slideBtn} onClick={() => slide(-120)}>◀</button>
    <div 
      ref={ref}
      className="zone-scroll"
      data-zone-id="hand"
      onClick={() => onZoneTap("hand")}
      style={{ 
        flex: 1, minWidth: 0,
        display: "flex", 
        flexWrap: "nowrap",
        alignItems: "center", 
        overflowX: "auto", // 枚数が多いときは潰さず横スクロール
        padding: "3px 6px", 
        gap: "2px", 
      }}
    >
       {[...hand].map((url, i) => ({url, i})).map(({url, i}) => (
         <DraggableCard key={i} {...getDragProps("hand", i, { url })} style={{ flex: "0 0 46px", height: "64px", overflow: "hidden", marginLeft: i === 0 ? "auto" : 0, marginRight: i === hand.length - 1 ? "auto" : 0 }}>
           <div style={{ height: "100%", position: "relative" }}>
              <img src={getProxyImageUrl(url)} style={{ 
                  width: "100%", height: "100%", objectFit: "cover", objectPosition: "left top", borderRadius: "var(--radius-sm)", border: freshIdx.includes(i) ? "2px solid #2196f3" : "1px solid var(--border-color-dark)", cursor: "pointer",
                  boxShadow: selectedCard?.zone === "hand" && selectedCard?.index === i ? "0 0 0 3px yellow" : (freshIdx.includes(i) ? "0 0 6px #2196f3" : "none"),
                  transform: selectedCard?.zone === "hand" && selectedCard?.index === i ? "translateY(10px)" : "none",
                  transition: "transform 0.1s"
                }} 
              />
           </div>
         </DraggableCard>
       ))}
    </div>
    <button style={slideBtn} onClick={() => slide(120)}>▶</button>
    </div>
  );
};
