import { DraggableCard } from "../DraggableCard";
import { useRef } from "react";
import { ListButton } from "../ListButton";
import { getProxyImageUrl } from "../../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

const slideBtn = { flex: "0 0 auto", width: "18px", alignSelf: "stretch", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", padding: 0, fontSize: "0.7rem", cursor: "pointer" };

export const PlayerUtilityRow = ({ 
  deck, hyperspace, graveyard, tempZone, shields,
  selectedCard, onViewMode, onDeckTap, onZoneTap, getDragProps
}) => {
  const shieldRef = useRef(null);
  const slide = (d) => shieldRef.current?.scrollBy({ left: d, behavior: "smooth" });
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center", padding: "2px 10px", background: "#111", flexShrink: 0 }}>
      
      {/* 一時ゾーン */}
      <div 
        data-zone-id="temp" 
        style={{ 
          display:"flex", flexDirection:"column", alignItems:"center",
          padding: "2px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "rgba(111, 66, 193, 0.05)" 
        }}
      >
        <DraggableCard {...getDragProps("temp", tempZone.length-1, tempZone.length > 0 ? tempZone[tempZone.length-1] : {})} style={{ height: "50px" }}>
           <div 
             onClick={() => onViewMode("temp")}
             style={{ 
               width: "36px", height: "50px", border: "2px dashed var(--purple-color)", borderRadius: "var(--radius-sm)", 
               display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative",
               background: "#1a1a1a"
             }}
           >
             {tempZone.length > 0 ? (
               (() => {
                 const top = tempZone[tempZone.length-1];
                 return <img src={top.isFaceDown ? CARD_BACK_URL : getProxyImageUrl(top.url)} style={{width:"100%", height:"100%", opacity:0.8, pointerEvents: "none"}} />;
               })()
             ) : <span style={{fontSize:"0.7rem", color:"var(--purple-color)", pointerEvents: "none"}}>一時</span>}
             <span style={{ position: "absolute", bottom: "-12px", fontSize: "0.7rem", color: "var(--text-secondary)", pointerEvents: "none" }}>{tempZone.length}</span>
           </div>
        </DraggableCard>
      </div>

      {/* シールド (横一列・はみ出す分は横スクロール) */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: "1 1 0", minWidth: "60px" }}>
        <button style={slideBtn} onClick={() => slide(-80)}>◀</button>
        <div
          ref={shieldRef}
          className="zone-scroll"
          data-zone-id="shield"
          style={{
            display: "flex", gap: "3px", flexWrap: "nowrap", overflowX: "auto", flex: 1, minWidth: 0,
            alignItems: "center", minHeight: "44px", padding: "2px"
          }}
        >
          {shields.map((s, i) => (
            <DraggableCard key={i} {...getDragProps("shield", i, { url: s, isFaceDown: true })} style={{ flexShrink: 0 }}>
              <div style={{ width: "28px", height: "39px", cursor: "pointer" }}>
                <img src={CARD_BACK_URL} style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)", border: "1px solid #b8860b", boxShadow: selectedCard?.zone === "shield" && selectedCard?.index === i ? "0 0 0 2px yellow" : "none" }} />
              </div>
            </DraggableCard>
          ))}
        </div>
        <button style={slideBtn} onClick={() => slide(80)}>▶</button>
        <ListButton onClick={() => onViewMode("shield")} />
      </div>

      {/* 山札・超次元・墓地 (横並び) */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        
        {/* 山札 */}
        <div data-zone-id="deckTop" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
           <DraggableCard {...getDragProps("deck", 0, deck.length > 0 ? { url: deck[0] } : {})} style={{ height: "50px" }}>
             <div 
               onClick={() => onViewMode("deck")}
               style={{ 
                 width: "36px", height: "50px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative",
                 boxShadow: selectedCard?.zone === "deck" ? "0 0 8px 2px cyan" : "none"
               }}
             >
                {deck.length > 0 ? (
                  <img src={CARD_BACK_URL} style={{width:"100%", height:"100%", borderRadius: "var(--radius-sm)"}} />
                ) : <span style={{fontSize:"0.7rem", color:"var(--text-dim)"}}>0</span>}
                <span style={{ position: "absolute", bottom: "-12px", fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>山上 {deck.length}</span>
             </div>
           </DraggableCard>
        </div>

        {/* 山上/山下へ置くためのドロップ先 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {[["deckTop", "山上"], ["deckBottom", "山下"]].map(([id, label]) => (
            <div key={id} data-zone-id={id} style={{
              width: "36px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px dashed var(--border-color-light)", borderRadius: "var(--radius-sm)",
              background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", fontSize: "0.65rem", whiteSpace: "nowrap"
            }}>{label}</div>
          ))}
        </div>

        {/* 超次元 */}
        <div data-zone-id="hyperspace" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <DraggableCard {...getDragProps("hyperspace", hyperspace.length-1, hyperspace.length > 0 ? { url: typeof hyperspace[hyperspace.length-1] === 'object' ? hyperspace[hyperspace.length-1].url : hyperspace[hyperspace.length-1], faces: typeof hyperspace[hyperspace.length-1] === 'object' ? hyperspace[hyperspace.length-1].faces : null } : {})} style={{ height: "50px" }}>
            <div
              onClick={() => onViewMode("hyperspace")}
              style={{ width: "36px", height: "50px", border: "1px dashed var(--info-color)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              {hyperspace.length > 0 ?
                (() => {
                  const top = hyperspace[hyperspace.length-1];
                  const topUrl = typeof top === 'object' ? top.url : top;
                  return <img src={getProxyImageUrl(topUrl)} style={{width:"100%", height:"100%", opacity:0.8}} />;
                })() :
                <span style={{fontSize:"0.65rem", color:"var(--info-color)"}}>超 {hyperspace.length}</span>
              }
            </div>
          </DraggableCard>
        </div>

        {/* 墓地 */}
        <div data-zone-id="grave" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <DraggableCard {...getDragProps("grave", graveyard.length-1, graveyard.length > 0 ? { url: graveyard[graveyard.length-1] } : {})} style={{ height: "50px" }}>
            <div 
              onClick={() => onViewMode("grave")} 
              style={{ width: "36px", height: "50px", border: "1px dashed var(--border-color-light)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              {graveyard.length > 0 ? 
                <img src={getProxyImageUrl(graveyard[graveyard.length-1])} style={{width:"100%", height:"100%", opacity:0.8}} /> : 
                <span style={{fontSize:"0.7rem", color:"var(--text-dim)"}}>墓 {graveyard.length}</span>
              }
            </div>
          </DraggableCard>
        </div>
      </div>
    </div>
  );
};
