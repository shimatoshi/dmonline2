import { useRef, useEffect } from 'react';

export const useDraggable = ({ data, onDragStart, onDragMove, onDragEnd, onTap, onLongPress, onHold, onHoldEnd }) => {
  const ref = useRef(null);
  const timeoutRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  const activeId = useRef(null);
  const suppressClickRef = useRef(false);
  const heldRef = useRef(false);

  // 長押し中の拡大を解除し、押下中だったか返す
  const releaseHold = () => {
    if (!heldRef.current) return false;
    heldRef.current = false;
    onHoldEnd && onHoldEnd();
    return true;
  };

  // 押している最中にカードが消えた(再描画・移動)場合も拡大を残さない
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (heldRef.current) { heldRef.current = false; onHoldEnd && onHoldEnd(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = (e) => {
    // 複数の指・マウスの右/中ボタンは無視
    if (activeId.current !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    activeId.current = e.pointerId;
    // カード外に出てもmove/upを受け取る
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }

    const touch = e;
    startPos.current = { x: touch.clientX, y: touch.clientY };
    
    // 長押しタイマー開始 (500ms)
    heldRef.current = false;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null; // タイマー消化済み
      heldRef.current = true;
      onHold && onHold(); // 押している間だけ拡大
    }, 500);
  };

  const handlePointerMove = (e) => {
    if (e.pointerId !== activeId.current) return;
    const touch = e;
    const dx = touch.clientX - startPos.current.x;
    const dy = touch.clientY - startPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 一定距離(10px)動いたらドラッグとみなす
    if (dist > 10) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!isDraggingRef.current) {
        releaseHold();
        isDraggingRef.current = true;
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

  const handlePointerUp = (e) => {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    // 長押し後に離した: 拡大を解除してから従来どおり詳細メニューを開く
    if (releaseHold() && !isDraggingRef.current) {
      onLongPress && onLongPress();
    }
    // 長押しタイマーキャンセル
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      // タイマーが生きていた＝長押し発動前＝タップとみなす
      // ただしドラッグしてない場合に限る
      if (!isDraggingRef.current) {
         onTap && onTap();
      }
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      // ドロップ直後に発火するclickを無効化する
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 0);
      // ドロップ処理
      const touch = e;
      onDragEnd && onDragEnd(data, { x: touch.clientX, y: touch.clientY });
    }
  };

  // 中断(スクロール奪取など)時はタップ・ドラッグを発火せず状態だけ戻す
  const handlePointerCancel = (e) => {
    if (e.pointerId !== activeId.current) return;
    activeId.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isDraggingRef.current = false;
    releaseHold();
  };

  return {
    ref,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onClickCapture: (e) => {
      if (suppressClickRef.current) { e.stopPropagation(); e.preventDefault(); }
    }
  };
};
