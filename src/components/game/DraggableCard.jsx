import { useContext } from "react";
import { MultiSelectContext } from "./MultiSelectContext";
import { useDraggable } from "../../hooks/useDraggable";
import { emitCardZoom } from "./CardZoomOverlay";

export const DraggableCard = ({ children, data, onDragStart, onDragEnd, onTap, onLongPress, style = {}, ...props }) => {
  const { picked } = useContext(MultiSelectContext);
  const order = data && !data.isOpponent ? picked.findIndex((p) => p.zone === data.zone && p.index === data.index) : -1;
  const { ref, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture } = useDraggable({
    data, onDragStart, onDragEnd, onTap, onLongPress,
    // 相手の伏せカードは中身を見せない
    onHold: () => {
      const d = data || {};
      if (d.url && !(d.isOpponent && d.isFaceDown)) emitCardZoom(d);
    },
    onHoldEnd: () => emitCardZoom(null)
  });

  return (
    <div 
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
      onContextMenu={(e) => e.preventDefault()} // ★長押しメニュー無効化
      style={{ 
        position: "relative",
        ...(order >= 0 ? { outline: "2px solid var(--accent-color)", outlineOffset: "-2px" } : {}),
        touchAction: "none", 
        userSelect: "none", 
        WebkitUserSelect: "none", 
        WebkitTouchCallout: "none", // ★iOS画像保存無効化
        ...style 
      }}
      {...props}
    >
      {children}
      {order >= 0 && (
        <div style={{ position: "absolute", top: 0, left: 0, minWidth: "16px", height: "16px", padding: "0 3px", boxSizing: "border-box", borderRadius: "var(--radius-pill)", background: "var(--accent-color)", color: "#fff", fontSize: "0.65rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 2 }}>
          {order + 1}
        </div>
      )}
    </div>
  );
};
