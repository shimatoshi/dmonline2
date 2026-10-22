import { useDraggable } from "../../hooks/useDraggable";
import { emitCardZoom } from "./CardZoomOverlay";

export const DraggableCard = ({ children, data, onDragStart, onDragEnd, onTap, onLongPress, style = {}, ...props }) => {
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
        touchAction: "none", 
        userSelect: "none", 
        WebkitUserSelect: "none", 
        WebkitTouchCallout: "none", // ★iOS画像保存無効化
        ...style 
      }}
      {...props}
    >
      {children}
    </div>
  );
};
