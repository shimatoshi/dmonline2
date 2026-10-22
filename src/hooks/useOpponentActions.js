import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { cloneZones } from "../utils/zoneUtils";

// ゾーン名 → データキー
const ZONE_KEYS = {
  battle: "battleZone", mana: "manaZone", shield: "shields",
  hand: "hand", grave: "graveyard", deck: "deck", hyperspace: "hyperspace", temp: "tempZone",
};

export const useOpponentActions = (roomId, isHost, roomData, generateId) => {
  const [selectedOpponentCard, setSelectedOpponentCard] = useState(null);
  const [interactionMode, setInteractionMode] = useState(false);
  const [revealOpponentHand, setRevealOpponentHand] = useState(false);

  const handleOpponentInteract = (targetZone, index) => {
    setSelectedOpponentCard({ zone: targetZone, index });
  };

  // 相手ゾーン操作の共通ロジック
  // indices: 取り出すインデックスの配列(指定順に移動先へ積む)
  const executeOpponentManyLogic = async (zone, indices, actionType) => {
    if (!roomData) return;
    const opponentRole = isHost ? "guestData" : "hostData";
    const opponentData = roomData[opponentRole];
    if (!opponentData) return;

    const zones = cloneZones(opponentData);

    // 取り出し
    const key = ZONE_KEYS[zone];
    if (!key || !zones[key]) return;
    const list = zones[key];
    const picked = indices.filter((i) => list[i] !== undefined);
    if (!picked.length) return;
    const taken = picked.map((i) => list[i]);
    [...picked].sort((a, b) => b - a).forEach((i) => list.splice(i, 1));

    const topAcc = [];
    taken.forEach((targetCard) => {
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
      topAcc.push(...cardsToMove);
    } else if (actionType === "deckBottom") {
      zones.deck = [...zones.deck, ...cardsToMove];
    } else if (actionType === "temp") {
      cardsToMove.forEach(c => zones.tempZone.push({ url: c, isFaceDown: false }));
    }
    });
    if (topAcc.length) zones.deck = [...topAcc, ...zones.deck];

    // awaitしない: オフライン時に書き込みPromiseが解決せず後続処理（選択解除など）が
    // 止まるのを防ぐ。反映はonSnapshotのローカルキャッシュ経由で即時行われる
    updateDoc(doc(db, "rooms", roomId), { [opponentRole]: zones })
      .catch((e) => console.error("opponent zone update failed:", e));
  };

  const executeOpponentActionLogic = (zone, index, actionType) => executeOpponentManyLogic(zone, [index], actionType);

  // 一覧ウィンドウからの複数移動
  const moveOpponentMany = (zone, indices, actionType) => executeOpponentManyLogic(zone, indices, actionType);

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
    executeOpponentActionLogic, moveOpponentMany,
    revealOpponentHand,
    setRevealOpponentHand
  };
};
