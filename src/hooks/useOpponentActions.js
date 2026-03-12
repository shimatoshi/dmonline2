import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const useOpponentActions = (roomId, isHost, roomData, generateId) => {
  const [selectedOpponentCard, setSelectedOpponentCard] = useState(null);
  const [interactionMode, setInteractionMode] = useState(false);
  const [revealOpponentHand, setRevealOpponentHand] = useState(false);

  const handleOpponentInteract = (targetZone, index) => {
    setSelectedOpponentCard({ zone: targetZone, index });
  };

  // 取り出し・追加の共通ロジック
  const executeAction = async (zone, index, actionType) => {
    if (!roomData) return;
    const opponentRole = isHost ? "guestData" : "hostData";
    const opponentData = roomData[opponentRole];
    if (!opponentData) return;

    let newOppData = { ...opponentData };
    let targetCard = null;

    // ゾーン名 → データキーのマッピング
    const zoneKeyMap = {
      battle: "battleZone", mana: "manaZone", shield: "shields",
      hand: "hand", grave: "graveyard", hyperspace: "hyperspace",
      grZone: "grZone", deck: "deck", temp: "tempZone"
    };

    // 取り出し
    const srcKey = zoneKeyMap[zone];
    if (srcKey) {
      const list = [...(newOppData[srcKey] || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData[srcKey] = list;
    }

    if (!targetCard) return;

    const targetUrl = typeof targetCard === "object" ? targetCard.url : targetCard;
    const targetStack = typeof targetCard === "object" ? (targetCard.stack || []) : [];
    const cardsToMove = [targetUrl, ...targetStack];

    // 追加先
    if (actionType === "grave") {
      newOppData.graveyard = [...(newOppData.graveyard || []), ...cardsToMove];
    } else if (actionType === "hand") {
      newOppData.hand = [...(newOppData.hand || []), ...cardsToMove];
    } else if (actionType === "mana") {
      const dest = [...(newOppData.manaZone || [])];
      cardsToMove.forEach(c => dest.push({ url: c, isTapped: false, isFaceDown: false, id: generateId() }));
      newOppData.manaZone = dest;
    } else if (actionType === "shield") {
      newOppData.shields = [...(newOppData.shields || []), ...cardsToMove];
    } else if (actionType === "battle") {
      const dest = [...(newOppData.battleZone || [])];
      cardsToMove.forEach(c => dest.push({ url: c, isTapped: false, isFaceDown: false, stack: [], id: generateId() }));
      newOppData.battleZone = dest;
    } else if (actionType === "hyperspace") {
      newOppData.hyperspace = [...(newOppData.hyperspace || []), ...cardsToMove];
    } else if (actionType === "grZone") {
      const dest = [...(newOppData.grZone || []), ...cardsToMove];
      dest.sort(() => Math.random() - 0.5);
      newOppData.grZone = dest;
    } else if (actionType === "deck" || actionType === "deckTop") {
      newOppData.deck = [...cardsToMove, ...(newOppData.deck || [])];
    } else if (actionType === "deckBottom") {
      newOppData.deck = [...(newOppData.deck || []), ...cardsToMove];
    }

    await updateDoc(doc(db, "rooms", roomId), { [opponentRole]: newOppData });
  };

  // state経由の干渉実行
  const executeOpponentAction = async (actionType) => {
    if (!selectedOpponentCard) return;
    const { zone, index } = selectedOpponentCard;
    await executeAction(zone, index, actionType);
    setSelectedOpponentCard(null);
    setInteractionMode(false);
  };

  // ドラッグ操作による直接実行
  const performOpponentActionDirect = async (zone, index, actionType) => {
    await executeAction(zone, index, actionType);
  };

  return {
    selectedOpponentCard, setSelectedOpponentCard,
    interactionMode, setInteractionMode,
    handleOpponentInteract,
    executeOpponentAction,
    performOpponentActionDirect,
    revealOpponentHand, setRevealOpponentHand
  };
};
