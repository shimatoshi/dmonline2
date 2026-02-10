import { useRef } from "react";
import { CardView } from "./CardView";
import { DraggableCard } from "./DraggableCard";
import { getProxyImageUrl } from "../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

// スクロールボタンのスタイル
const scrollBtnStyle = (isLeft, height, isOpponent) => ({
  position: "absolute",
  top: 0,
  [isLeft ? "left" : "right"]: 0,
  width: "20px",
  height: height,
  background: "rgba(0,0,0,0.4)",
  color: "white",
  border: "none",
  zIndex: 5,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.8rem",
  padding: 0,
  cursor: "pointer",
  transform: isOpponent ? "rotate(180deg)" : "none"
});

// ゾーン内スクロール処理
const scrollZone = (ref, amount) => {
  if (ref.current) {
    ref.current.scrollBy({ left: amount, behavior: "smooth" });
  }
};

export const Zone = ({ 
  type = "row", // row, grid, stack
  cards = [], 
  zoneId, 
  cardSize = { width: "56px", height: "78px" }, // デフォルトサイズ
  getDragProps,
  onZoneTap,
  isOpponent = false,
  revealHand = false, // 相手の手札公開用
  style = {},
  interactionMode = false // 相手のマナなどドラッグ可能かどうかの判定用
}) => {
  const ref = useRef(null);
  const { width, height } = cardSize;

  // --- 横並び (手札・マナ) ---
  if (type === "row") {
    // コンテナの高さはカード高さ + 余白
    const containerHeight = parseInt(height) + 10 + "px"; 
    
    return (
      <div style={{ position: "relative", width: "100%", ...style }}>
        <button onClick={() => scrollZone(ref, -100)} style={scrollBtnStyle(true, containerHeight, isOpponent)}>◀</button>
        <div 
          ref={ref}
          data-zone-id={zoneId}
          onClick={onZoneTap}
          style={{ 
            height: containerHeight, 
            display: "flex", alignItems: "center", overflowX: "auto", 
            padding: "0 25px", gap: "2px", scrollbarWidth: "none",
            justifyContent: isOpponent ? "center" : "flex-start" // 相手側は中央寄せ
          }}
        >
           {cards.map((card, i) => {
             // データ正規化: 文字列なら { url: ... } に
             const cardData = typeof card === 'string' ? { url: card } : card;
             const url = revealHand || !cardData.isFaceDown ? getProxyImageUrl(cardData.url) : CARD_BACK_URL;
             
             return (
               <DraggableCard 
                 key={cardData.id || i} 
                 {...getDragProps(i, cardData)} 
                 style={{ height, width, flexShrink: 0, marginRight: cardData.isTapped ? "12px" : "2px" }}
               >
                 {/* CardViewを使うか、直接imgを使うか */}
                 {cardData.isTapped !== undefined ? (
                   <CardView url={cardData.url} isFaceDown={!revealHand && cardData.isFaceDown} isTapped={cardData.isTapped} onClick={() => {}} style={{ width, height }} />
                 ) : (
                   <div style={{ width, height, position: "relative" }}>
                      <img src={url} style={{ width: "100%", height: "100%", borderRadius: "3px", border: "1px solid #555" }} />
                   </div>
                 )}
               </DraggableCard>
             );
           })}
        </div>
        <button onClick={() => scrollZone(ref, 100)} style={scrollBtnStyle(false, containerHeight, isOpponent)}>▶</button>
      </div>
    );
  }

  // --- グリッド (バトルゾーン) ---
  if (type === "grid") {
    return (
      <div 
        data-zone-id={zoneId} 
        onClick={onZoneTap}
        style={{ 
          flex: 1, display: "flex", justifyContent: "center", alignItems: "center", 
          flexWrap: "wrap", gap: "4px", padding: "10px", 
          overflowY: "auto", minHeight: "80px", ...style 
        }}
      >
         {cards.length === 0 && <span style={{fontSize:"0.8rem", color:"#333"}}>{zoneId}</span>}
         {cards.map((card, i) => {
           const cardData = typeof card === 'string' ? { url: card } : card;
           return (
             <DraggableCard key={cardData.id || i} {...getDragProps(i, cardData)} style={{position:"relative"}} data-index={i}>
               <div style={{ position: "relative" }}>
                 <CardView url={cardData.url} isFaceDown={cardData.isFaceDown} isTapped={cardData.isTapped} onClick={() => {}} style={{ width }} />
                 {/* 重なりバッジ */}
                 {cardData.stack && cardData.stack.length > 0 && (
                   <div style={{position:"absolute", top:-5, right:-5, background:"#d32f2f", color:"white", borderRadius:"50%", width:"20px", height:"20px", fontSize:"0.75rem", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid white", pointerEvents:"none"}}>
                     {cardData.stack.length + 1}
                   </div>
                 )}
               </div>
             </DraggableCard>
           );
         })}
      </div>
    );
  }

  // --- スタック (山札・墓地・一時) ---
  if (type === "stack") {
    // 一番上のカードだけ表示
    const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
    const cardData = topCard ? (typeof topCard === 'string' ? { url: topCard } : topCard) : null;
    
    // 表示内容
    let content = <span style={{fontSize:"0.6rem", color:"#555"}}>{zoneId}</span>;
    if (cardData) {
       // 山札は常に裏向き
       const isDeck = zoneId === "deck";
       const url = (isDeck || cardData.isFaceDown) ? CARD_BACK_URL : getProxyImageUrl(cardData.url);
       content = <img src={url} style={{width:"100%", height:"100%", opacity: 0.9, pointerEvents: "none"}} />;
    }

    const innerContent = (
      <div 
        data-zone-id={zoneId}
        onClick={onZoneTap}
        style={{ 
          width, height, 
          border: zoneId === "temp" ? "2px dashed #6f42c1" : "1px dashed #444", 
          borderRadius: "3px", display: "flex", alignItems: "center", justifyContent: "center", 
          cursor: "pointer", position: "relative", background: "#1a1a1a"
        }}
      >
        {content}
        <span style={{ position: "absolute", bottom: "-14px", fontSize: "0.7rem", color: "#aaa", pointerEvents: "none" }}>{cards.length}</span>
      </div>
    );

    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", ...style }}>
        {cards.length > 0 ? (
          <DraggableCard {...getDragProps(cards.length - 1, cardData || {})} style={{ height }}>
            {innerContent}
          </DraggableCard>
        ) : (
          <div style={{ height }}>
            {innerContent}
          </div>
        )}
        {/* 見るボタンはZoneの外側で実装するか、ここに入れるか。ここではシンプルにZoneTapで見る想定にするか、ボタンをつけるか */}
        {/* 今回は既存UIに合わせてボタンをつける形にするが、ボタンのハンドラは onZoneTap ではなく onView という別Propにする手もある */}
      </div>
    );
  }

  return null;
};
