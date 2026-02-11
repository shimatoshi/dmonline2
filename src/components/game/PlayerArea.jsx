import { CardView } from "./CardView";
import { getProxyImageUrl } from "../../utils/apiConfig";
import { SideControlMenu } from "./SideControlMenu";
import { DraggableCard } from "./DraggableCard"; // ★追加
const CARD_BACK_URL = "/card_back.jpg";

export const PlayerArea = ({ 
  hand, battleZone, manaZone, shields, graveyard, deck, tempZone, hyperspace,
  selectedCard, interactionMode,
  onZoneTap, onCardTap, onQuickTap, onDeckTap, onDrawCard, onViewMode, 
  onSetup, onStartTurn, onEndTurn, onShuffle, onSetInteractionMode,
  onDragStart, onDragMove, onDragEnd 
}) => {
  
  // 共通のドラッグProps生成
  const getDragProps = (zone, index, data) => ({
    data: { zone, index, ...data },
    onDragStart,
    onDragMove,
    onDragEnd,
    onTap: () => {
      // バトル・マナはクイックタップで向きを変える
      if (zone === "battle" || zone === "mana") {
        onQuickTap(zone, index);
      } else if (zone === "hand") {
        // 手札はタップで拡大（または選択）
        onCardTap(null, zone, index, data);
      }
    },
    onLongPress: () => {
      // 全てのゾーンで長押しは詳細メニュー（選択状態にする）
      onCardTap(null, zone, index, data);
    }
  });

  return (
    <div style={{ flex: 1.2, display: "flex", flexDirection: "column", background: "#0a0a0a", position: "relative" }}>
      
      <SideControlMenu 
        onShuffle={onShuffle}
        onViewTemp={() => onViewMode("temp")}
        onToggleInteract={() => onSetInteractionMode(!interactionMode)}
        interactionMode={interactionMode}
        tempZoneCount={tempZone.length}
      />

      {/* 右上：アクションボタン群 (セットアップ/終了/開始) */}
      <div style={{ position: "absolute", top: "-28px", right: "4px", zIndex: 10, display: "flex", gap: "6px" }}>
         <button className="btn btn-success" onClick={onSetup} style={{ fontSize: "0.7rem", padding: "2px 6px", border: "1px solid #28a745", boxShadow: "0 2px 4px black", color: "white" }}>🎲準備</button>
         <button className="btn btn-danger" onClick={onEndTurn} style={{ fontSize: "0.7rem", padding: "2px 6px", border: "1px solid #dc3545", boxShadow: "0 2px 4px black", color: "white" }}>🛑終了</button>
         <button className="btn btn-primary" onClick={onStartTurn} style={{ fontSize: "0.7rem", padding: "2px 6px", border: "1px solid #007bff", boxShadow: "0 2px 4px black", color: "white" }}>⚡開始</button>
      </div>

      {/* バトルゾーン */}
      <div 
        className="zone-scroll"
        data-zone-id="battle" // ★ドロップ用ID
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

      {/* ミドルエリア */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center", padding: "5px 10px", background: "#111" }}>
          
          {/* 一時ゾーン (ドロップ用) */}
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
              👀見る
            </button>
          </div>

          {/* シールド */}
          <div 
            className="zone-scroll"
            data-zone-id="shield" 
            style={{ 
              display: "flex", gap: "4px", 
              justifyContent: shields.length >= 5 ? "flex-end" : "center",
              maxWidth: "180px", overflowX: "auto", paddingBottom: "4px",
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

          {/* 山札・超次元・墓地 (横並びで高さを節約) */}
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
              <DraggableCard {...getDragProps("hyperspace", hyperspace.length-1, hyperspace.length > 0 ? { url: hyperspace[hyperspace.length-1] } : {})} style={{ height: "63px" }}>
                <div 
                  onClick={() => onZoneTap("hyperspace")} 
                  style={{ width: "45px", height: "63px", border: "1px dashed #00bfff", borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}
                >
                  {hyperspace.length > 0 ? 
                    <img src={getProxyImageUrl(hyperspace[hyperspace.length-1])} style={{width:"100%", height:"100%", opacity:0.8}} /> : 
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

      {/* マナゾーン */}
      <div 
        className="zone-scroll"
        data-zone-id="mana" // ★ドロップ用ID
        onClick={() => onZoneTap("mana")}
        style={{ 
          height: "55px", 
          background: "#151515", 
          display: "flex", 
          alignItems: "center", 
          overflowX: "auto", 
          padding: "0 10px", 
          gap: "2px", 
          borderTop: "1px solid #222",
          transform: "rotate(180deg)",
          direction: "rtl"
        }}
      >
         {[...manaZone].map((card, i) => ({card, i})).map(({card, i}) => (
           <DraggableCard key={card.id || i} {...getDragProps("mana", i, card)} style={{ transform: "rotate(180deg)" }}>
             <CardView url={card.url} isFaceDown={card.isFaceDown} isTapped={card.isTapped} isSelected={selectedCard?.data === card}
               onClick={() => {}} style={{ height: "45px", width: "32px", flexShrink: 0, marginRight: card.isTapped ? "12px" : "2px" }} />
           </DraggableCard>
         ))}
      </div>

      {/* 手札エリア */}
      <div 
        className="zone-scroll"
        data-zone-id="hand" // ★ドロップ用ID
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
    </div>
  );
};
