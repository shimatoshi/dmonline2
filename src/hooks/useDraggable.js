import { useRef, useState, useEffect } from 'react';

export const useDraggable = ({ data, onDragStart, onDragMove, onDragEnd, onTap, onLongPress }) => {
  const ref = useRef(null);
  const timeoutRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e) => {
    // 複数の指は無視
    if (e.touches.length > 1) return;
    
    const touch = e.touches[0];
    startPos.current = { x: touch.clientX, y: touch.clientY };
    
    // 長押しタイマー開始 (500ms)
    timeoutRef.current = setTimeout(() => {
      onLongPress && onLongPress();
      timeoutRef.current = null; // タイマー消化済み
    }, 500);
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const dx = touch.clientX - startPos.current.x;
    const dy = touch.clientY - startPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 一定距離(10px)動いたらドラッグとみなす
    if (dist > 10) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!isDragging) {
        setIsDragging(true);
        // ドラッグ開始を親に通知
        onDragStart && onDragStart(data, { x: touch.clientX, y: touch.clientY });
      } else {
        // ドラッグ中の移動
        onDragMove && onDragMove({ x: touch.clientX, y: touch.clientY });
      }
      
      // スクロール防止
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    // 長押しタイマーキャンセル
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      // タイマーが生きていた＝長押し発動前＝タップとみなす
      // ただしドラッグしてない場合に限る
      if (!isDragging) {
         onTap && onTap();
      }
    }

    if (isDragging) {
      setIsDragging(false);
      // ドロップ処理
      // e.changedTouches[0] で離した場所を取得
      const touch = e.changedTouches[0];
      onDragEnd && onDragEnd(data, { x: touch.clientX, y: touch.clientY });
    }
  };

  return {
    ref,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};
