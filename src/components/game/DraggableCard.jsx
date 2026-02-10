import { useDraggable } from "../../hooks/useDraggable";

export const DraggableCard = ({ children, data, onDragStart, onDragEnd, onTap, onLongPress, style = {}, ...props }) => {
  const { ref, onTouchStart, onTouchMove, onTouchEnd } = useDraggable({
    data, onDragStart, onDragEnd, onTap, onLongPress
  });

  return (
    <div 
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
