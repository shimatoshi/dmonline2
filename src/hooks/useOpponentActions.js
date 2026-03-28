import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { cloneZones } from "../utils/zoneUtils";

// ゾーン名 → データキー
const ZONE_KEYS = {
  battle: "battleZone", mana: "manaZone", shield: "shields",
  hand: "hand", grave: "graveyard", deck: "deck", hyperspace: "hyperspace",
};

export const useOpponentActions = (roomId, isHost, roomData, generateId) => {
  const [selectedOpponentCard, setSelectedOpponentCard] = useState(null);
  const [interactionMode, setInteractionMode] = useState(false);
  const [revealOpponentHand, setRevealOpponentHand] = useState(false);

  const handleOpponentInteract = (targetZone, index) => {
    setSelectedOpponentCard({ zone: targetZone, index });
  };

  // 相手ゾーン操作の共通ロジック
  const executeOpponentActionLogic = async (zone, index, actionType) => {
    if (!roomData) return;
    const opponentRole = isHost ? "guestData" : "hostData";
    const opponentData = roomData[opponentRole];
    if (!opponentData) return;

    const zones = cloneZones(opponentData);

    // 取り出し
    const key = ZONE_KEYS[zone];
    if (!key || !zones[key]) return;
    const list = zones[key];
    const targetCard = list[index];
    if (!targetCard) return;
    list.splice(index, 1);

    // カード情報の正規化
    const targetUrl = typeof targetCard === "object" ? targetCard.url : targetCard;
    const targetStack = typeof targetCard === "object" ? (targetCard.stack || []) : [];
    const targetFaces = typeof targetCard === "object" ? targetCard.faces : null;
    const cardsToMove = [targetUrl, ...targetStack];

    // 移動先へ追加
    if (actionType === "grave") {
      cardsToMove.forEach(c => zones.graveyard.push(c));
    } else if (actionType === "hand") {
      cardsToMove.forEach(c => zones.hand.push(c));
    } else if (actionType === "mana") {
      cardsToMove.forEach(c => zones.manaZone.push({ url: c, isTapped: false, isFaceDown: false, id: generateId() }));
    } else if (actionType === "shield") {
      cardsToMove.forEach(c => zones.shields.push(c));
    } else if (actionType === "battle") {
      cardsToMove.forEach(c => zones.battleZone.push({ url: c, isTapped: false, isFaceDown: false, stack: [], id: generateId() }));
    } else if (actionType === "hyperspace") {
      if (targetFaces) {
        zones.hyperspace.push({ url: targetUrl, faces: targetFaces });
      } else {
        cardsToMove.forEach(c => zones.hyperspace.push(c));
      }
    } else if (actionType === "deck" || actionType === "deckTop") {
      zones.deck = [...cardsToMove, ...zones.deck];
    } else if (actionType === "deckBottom") {
      zones.deck = [...zones.deck, ...cardsToMove];
    }

    await updateDoc(doc(db, "rooms", roomId), { [opponentRole]: zones });
  };

  // state経由のアクション実行
  const executeOpponentAction = async (actionType) => {
    if (!selectedOpponentCard) return;
    const { zone, index } = selectedOpponentCard;
    await executeOpponentActionLogic(zone, index, actionType);
    setSelectedOpponentCard(null);
    setInteractionMode(false);
  };

  // ドラッグ操作用（stateを汚さない）
  const performOpponentActionDirect = async (zone, index, actionType) => {
    await executeOpponentActionLogic(zone, index, actionType);
  };

  return {
    selectedOpponentCard, setSelectedOpponentCard,
    interactionMode, setInteractionMode,
    handleOpponentInteract,
    executeOpponentAction,
    performOpponentActionDirect,
    executeOpponentActionLogic,
    revealOpponentHand,
    setRevealOpponentHand
  };
};
