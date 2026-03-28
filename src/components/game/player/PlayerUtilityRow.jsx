import { DraggableCard } from "../DraggableCard";
import { getProxyImageUrl } from "../../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

export const PlayerUtilityRow = ({ 
  deck, hyperspace, graveyard, tempZone, shields,
  selectedCard, onViewMode, onDeckTap, onZoneTap, getDragProps
}) => {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center", padding: "5px 10px", background: "#111" }}>
      
      {/* 一時ゾーン */}
      <div 
        data-zone-id="temp" 
        style={{ 
          display:"flex", flexDirection:"column", alignItems:"center",
          padding: "2px", border: "1px solid #333", borderRadius: "5px", background: "rgba(111, 66, 193, 0.05)" 
        }}
      >
        <DraggableCard {...getDragProps("temp", tempZone.length-1, tempZone.length > 0 ? tempZone[tempZone.length-1] : {})} style={{ height: "63px" }}>
           <div 
             onClick={() => onViewMode("temp")}
             style={{ 
               width: "45px", height: "63px", border: "2px dashed #6f42c1", borderRadius: "3px", 
               display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative",
               background: "#1a1a1a"
             }}
           >
             {tempZone.length > 0 ? (
               (() => {
                 const top = tempZone[tempZone.length-1];
                 return <img src={top.isFaceDown ? CARD_BACK_URL : getProxyImageUrl(top.url)} style={{width:"100%", height:"100%", opacity:0.8, pointerEvents: "none"}} />;
               })()
             ) : <span style={{fontSize:"0.6rem", color:"#6f42c1", pointerEvents: "none"}}>一時</span>}
             <span style={{ position: "absolute", bottom: "-12px", fontSize: "0.6rem", color: "#aaa", pointerEvents: "none" }}>{tempZone.length}</span>
           </div>
        </DraggableCard>
        <button 
          onClick={() => onViewMode("temp")}
          style={{ marginTop: "12px", background: "none", border: "1px solid #444", color: "#aaa", fontSize: "0.6rem", padding: "2px 6px", borderRadius: "4px", cursor: "pointer" }}
        >
          👀
        </button>
      </div>

      {/* シールド */}
      <div 
        className="zone-scroll"
        data-zone-id="shield" 
        style={{ 
          display: "flex", gap: "4px", flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "180px", paddingBottom: "4px",
          minHeight: "50px", minWidth: "80px",
          transform: "rotate(180deg)",
          direction: "rtl"
        }}
      >
         {[...shields].map((s, i) => ({s, i})).map(({s, i}) => (
           <DraggableCard key={i} {...getDragProps("shield", i, { url: s, isFaceDown: true })} style={{ flexShrink: 0, transform: "rotate(180deg)" }}>
             <div style={{ width: "36px", height: "50px", cursor: "pointer" }}>
                <img src={CARD_BACK_URL} style={{ width: "100%", height: "100%", borderRadius: "3px", border: "1px solid #b8860b", boxShadow: selectedCard?.zone === "shield" && selectedCard?.index === i ? "0 0 0 2px yellow" : "none" }} />
             </div>
           </DraggableCard>
         ))}
      </div>

      {/* 山札・超次元・墓地 (横並び) */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        
        {/* 山札 */}
        <div data-zone-id="deckTop" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
           <DraggableCard {...getDragProps("deck", 0, deck.length > 0 ? { url: deck[0] } : {})} style={{ height: "63px" }}>
             <div 
               onClick={onDeckTap}
               style={{ 
                 width: "45px", height: "63px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative",
                 boxShadow: selectedCard?.zone === "deck" ? "0 0 8px 2px cyan" : "none"
               }}
             >
                {deck.length > 0 ? (
                  <img src={CARD_BACK_URL} style={{width:"100%", height:"100%", borderRadius:"3px"}} />
                ) : <span style={{fontSize:"0.6rem", color:"#555"}}>0</span>}
                <span style={{ position: "absolute", bottom: "-12px", fontSize: "0.6rem", color: "#aaa" }}>山 {deck.length}</span>
             </div>
           </DraggableCard>
           <button 
              onClick={() => onViewMode("deck")}
              style={{ marginTop: "12px", background: "none", border: "1px solid #444", color: "#aaa", fontSize: "0.6rem", padding: "2px 4px", borderRadius: "4px", cursor: "pointer" }}
           >
             👁
           </button>
        </div>

        {/* 超次元 */}
        <div data-zone-id="hyperspace" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <DraggableCard {...getDragProps("hyperspace", hyperspace.length-1, hyperspace.length > 0 ? { url: typeof hyperspace[hyperspace.length-1] === 'object' ? hyperspace[hyperspace.length-1].url : hyperspace[hyperspace.length-1], faces: typeof hyperspace[hyperspace.length-1] === 'object' ? hyperspace[hyperspace.length-1].faces : null } : {})} style={{ height: "63px" }}>
            <div
              onClick={() => onZoneTap("hyperspace")}
              style={{ width: "45px", height: "63px", border: "1px dashed #00bfff", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              {hyperspace.length > 0 ?
                (() => {
                  const top = hyperspace[hyperspace.length-1];
                  const topUrl = typeof top === 'object' ? top.url : top;
                  return <img src={getProxyImageUrl(topUrl)} style={{width:"100%", height:"100%", opacity:0.8}} />;
                })() :
                <span style={{fontSize:"0.5rem", color:"#00bfff"}}>超 {hyperspace.length}</span>
              }
            </div>
          </DraggableCard>
          <button 
            onClick={() => onViewMode("hyperspace")}
            style={{ marginTop: "4px", background: "none", border: "1px solid #444", color: "#aaa", fontSize: "0.6rem", padding: "2px 4px", borderRadius: "4px", cursor: "pointer" }}
          >
            👁
          </button>
        </div>

        {/* 墓地 */}
        <div data-zone-id="grave" style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <DraggableCard {...getDragProps("grave", graveyard.length-1, graveyard.length > 0 ? { url: graveyard[graveyard.length-1] } : {})} style={{ height: "63px" }}>
            <div 
              onClick={() => onZoneTap("grave")} 
              style={{ width: "45px", height: "63px", border: "1px dashed #444", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
            >
              {graveyard.length > 0 ? 
                <img src={getProxyImageUrl(graveyard[graveyard.length-1])} style={{width:"100%", height:"100%", opacity:0.8}} /> : 
                <span style={{fontSize:"0.6rem", color:"#555"}}>墓 {graveyard.length}</span>
              }
            </div>
          </DraggableCard>
          <button 
            onClick={() => onViewMode("grave")}
            style={{ marginTop: "4px", background: "none", border: "1px solid #444", color: "#aaa", fontSize: "0.6rem", padding: "2px 4px", borderRadius: "4px", cursor: "pointer" }}
          >
            👁
          </button>
        </div>
      </div>
    </div>
  );
};
