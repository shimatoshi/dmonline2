import { getProxyImageUrl } from "../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

export const DragOverlay = ({ draggingCard, currentPos }) => {
  if (!draggingCard) return null;

  const { data, isFaceDown: forceFaceDown } = draggingCard;
  const url = data.url || data; 
  const isFaceDown = forceFaceDown || data.isFaceDown || false;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0,
      transform: `translate(${currentPos.x}px, ${currentPos.y}px) translate(-50%, -50%)`, // 指の中心に
      width: "60px", 
      zIndex: 9999,
      pointerEvents: "none", // ドロップ判定の邪魔にならないように
      opacity: 0.9,
      filter: "drop-shadow(0 10px 10px rgba(0,0,0,0.5))"
    }}>
      <img 
        src={isFaceDown ? CARD_BACK_URL : getProxyImageUrl(url)} 
        style={{ width: "100%", borderRadius: "4px", transform: "rotate(5deg)" }} 
      />
    </div>
  );
};
