import { useState } from "react";

export const useGameInteractions = ({
  performMoveWithData,
  performOpponentActionDirect,
  interactionMode,
  setViewMode,
  myDeck,
  setStackViewCards,
  setZoomedUrl
}) => {
  // UI State
  const [selectedCard, setSelectedCard] = useState(null);
  const [stackTarget, setStackTarget] = useState(null);
  
  // Drag State
  const [draggingCard, setDraggingCard] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  // 互換性のためのラッパー
  const performMove = (targetZoneName) => {
    if (!selectedCard) return;
    performMoveWithData(selectedCard, targetZoneName);
    setSelectedCard(null);
    // 一時ゾーン以外への移動ならビューモードを閉じる
    if (targetZoneName !== "temp" && selectedCard.zone !== "temp" && targetZoneName !== "temp") {
        setViewMode(null);
    }
  };

  const handleDragStart = (data, pos) => {
    setSelectedCard(null);
    const isFaceDown = data.zone === "deck" || data.zone === "shield" || (data.isFaceDown);
    setDraggingCard({ data, isFaceDown });
    setDragPos(pos);
  };

  const handleDragMove = (pos) => setDragPos(pos);

  const handleDragEnd = (data, pos) => {
    setDraggingCard(null);
    const element = document.elementFromPoint(pos.x, pos.y);
    if (!element) return;

    const zoneElement = element.closest("[data-zone-id]");
    if (zoneElement) {
      const targetZone = zoneElement.getAttribute("data-zone-id");

      // ★相手への干渉ドロップ (interactionModeがONのときのみ)
      if (data.isOpponent && interactionMode) {
        if (targetZone.startsWith("opponent-")) {
           const actionType = targetZone.replace("opponent-", "");
           performOpponentActionDirect(data.zone, data.index, actionType);
        }
        return;
      }

      // ターゲットがバトルゾーンの場合、カードの上にドロップされたか判定
      if (targetZone === "battle") {
         const cardElement = element.closest("[data-index]");
         if (cardElement) {
           const targetIndex = parseInt(cardElement.getAttribute("data-index"), 10);
           if (data.zone === "battle" && data.index === targetIndex) return;
           setSelectedCard({ zone: data.zone, index: data.index, data: data });
           setStackTarget({ index: targetIndex });
           return;
         }
      }
      if (data.zone === targetZone) return;
      performMoveWithData(data, targetZone);
    }
  };

  const handleDeckTap = () => {
    if (myDeck.length === 0) return;
    if (selectedCard && selectedCard.zone === "deck") { setSelectedCard(null); return; }
    setSelectedCard({ zone: "deck", index: 0, data: myDeck[0] });
  };

  const handleCardTap = (e, zone, index, cardData) => {
    if (e) e.stopPropagation();
    if (selectedCard && selectedCard.zone === zone && selectedCard.index === index) { setSelectedCard(null); return; }
    if (selectedCard && zone === "battle") { setStackTarget({ index, data: cardData }); return; }
    if (selectedCard && selectedCard.zone !== zone) { performMove(zone); return; }
    setSelectedCard({ zone, index, data: cardData });
  };

  const handleZoneTap = (zoneName) => {
    if (selectedCard && selectedCard.zone !== zoneName) performMove(zoneName);
  };

  return {
    selectedCard, setSelectedCard,
    stackTarget, setStackTarget,
    draggingCard, dragPos,
    performMove,
    handleDragStart, handleDragMove, handleDragEnd,
    handleDeckTap, handleCardTap, handleZoneTap
  };
};
