import { getProxyImageUrl } from "../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

export const CardView = ({ url, isFaceDown = false, isTapped = false, isSelected = false, onClick, style = {} }) => (
  <div onClick={onClick} style={{ 
    position: "relative", transition: "all 0.15s",
    transform: isTapped ? "rotate(90deg)" : "none",
    zIndex: isSelected ? 100 : "auto",
    ...style
  }}>
    <img src={isFaceDown ? CARD_BACK_URL : getProxyImageUrl(url)} style={{ 
      width: "100%", height: "100%", borderRadius: "3px", display: "block",
      boxShadow: isSelected ? "0 0 0 3px #ffff00, 0 4px 8px rgba(0,0,0,0.8)" : "0 1px 3px rgba(0,0,0,0.5)",
      border: "1px solid #222",
      filter: isSelected ? "brightness(1.1)" : "none"
    }} />
  </div>
);
