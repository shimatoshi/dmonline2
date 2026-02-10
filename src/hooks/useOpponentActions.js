import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const useOpponentActions = (roomId, isHost, roomData, generateId) => {
  const [selectedOpponentCard, setSelectedOpponentCard] = useState(null);
  const [interactionMode, setInteractionMode] = useState(false);
  const [revealOpponentHand, setRevealOpponentHand] = useState(false); // ★追加

  // 干渉ターゲット選択
  const handleOpponentInteract = (targetZone, index) => {
    setSelectedOpponentCard({ zone: targetZone, index });
  };

  // 干渉実行 (墓地送り、マナ送り、手札戻しなど)
  const executeOpponentAction = async (actionType) => {
    if (!roomData || !selectedOpponentCard) return;
    const opponentRole = isHost ? "guestData" : "hostData";
    const opponentData = roomData[opponentRole];
    if (!opponentData) return;

    const { zone, index } = selectedOpponentCard;
    let newOppData = { ...opponentData };
    
    // ターゲットの取得
    let targetCard = null;
    let targetUrl = "";
    let targetStack = [];

    // 取り出し処理
    if (zone === "battle") {
      const list = [...(newOppData.battleZone || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.battleZone = list;
    } else if (zone === "mana") {
      const list = [...(newOppData.manaZone || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.manaZone = list;
    } else if (zone === "shield") {
      const list = [...(newOppData.shields || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.shields = list;
    } else if (zone === "hand") { // 手札への干渉（ハンデス等）も将来的にありえるため
      const list = [...(newOppData.hand || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.hand = list;
    }

    if (!targetCard) return;

    // データ正規化
    targetUrl = typeof targetCard === 'object' ? targetCard.url : targetCard;
    targetStack = typeof targetCard === 'object' ? (targetCard.stack || []) : [];
    
    // 移動先へ追加 (スタックがある場合はバラして移動)
    const cardsToMove = [targetUrl, ...targetStack];

    if (actionType === "grave") {
      const dest = [...(newOppData.graveyard || [])];
      cardsToMove.forEach(c => dest.push(c));
      newOppData.graveyard = dest;
    } else if (actionType === "hand") {
      const dest = [...(newOppData.hand || [])];
      cardsToMove.forEach(c => dest.push(c));
      newOppData.hand = dest;
    } else if (actionType === "mana") {
      const dest = [...(newOppData.manaZone || [])];
      // マナにはオブジェクトとして追加
      cardsToMove.forEach(c => dest.push({ url: c, isTapped: false, isFaceDown: false, id: generateId() }));
      newOppData.manaZone = dest;
    } else if (actionType === "shield") {
      const dest = [...(newOppData.shields || [])];
      cardsToMove.forEach(c => dest.push(c));
      newOppData.shields = dest;
    } else if (actionType === "battle") { // バトルゾーンに出す（例: 相手の墓地蘇生など）
       const dest = [...(newOppData.battleZone || [])];
       cardsToMove.forEach(c => dest.push({ url: c, isTapped: false, isFaceDown: false, stack: [], id: generateId() }));
       newOppData.battleZone = dest;
    }

    await updateDoc(doc(db, "rooms", roomId), { [opponentRole]: newOppData });
    setSelectedOpponentCard(null);
    setInteractionMode(false); // 完了したらモード解除
  };

  // ドラッグ操作による相手へのアクション実行 (selectedOpponentCardを使わない版)
  const performOpponentActionDirect = async (zone, index, actionType) => {
    // 一時的にstateをセットして実行するのと同じロジックを使うか、
    // ここで直接呼ぶために executeOpponentAction をリファクタするか。
    // ここではstateを汚さずに実行したいので、ロジックを共通化するのが望ましいが、
    // 簡易的に state set -> execute は非同期で厄介なので、
    // executeOpponentAction の中身を少し変えて、引数で渡せるようにするのがベスト。
    // しかし今回は既存ロジックを壊さないよう、executeOpponentAction をラップする形ではなく
    // executeOpponentAction のロジックを引数ベースで動くように改修するアプローチをとる。
    
    // 上記 executeOpponentAction は state 依存なので、
    // 下記のように引数ベースの関数を定義し、executeOpponentAction はそれを呼ぶだけにする。
    
    await executeOpponentActionLogic(zone, index, actionType);
  };

  // 内部ロジック (引数ベース)
  const executeOpponentActionLogic = async (zone, index, actionType) => {
    if (!roomData) return;
    const opponentRole = isHost ? "guestData" : "hostData";
    const opponentData = roomData[opponentRole];
    if (!opponentData) return;

    let newOppData = { ...opponentData };
    let targetCard = null;

    // 取り出し
    if (zone === "battle") {
      const list = [...(newOppData.battleZone || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.battleZone = list;
    } else if (zone === "mana") {
      const list = [...(newOppData.manaZone || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.manaZone = list;
    } else if (zone === "shield") {
      const list = [...(newOppData.shields || [])];
      targetCard = list[index];
      list.splice(index, 1);
      newOppData.shields = list;
    } else if (zone === "hand") {
        const list = [...(newOppData.hand || [])];
        targetCard = list[index];
        list.splice(index, 1);
        newOppData.hand = list;
    } else if (zone === "grave") { // ★追加
        const list = [...(newOppData.graveyard || [])];
        targetCard = list[index];
        list.splice(index, 1);
        newOppData.graveyard = list;
    }

    if (!targetCard) return;

    const targetUrl = typeof targetCard === 'object' ? targetCard.url : targetCard;
    const targetStack = typeof targetCard === 'object' ? (targetCard.stack || []) : [];
    const cardsToMove = [targetUrl, ...targetStack];

    if (actionType === "grave") {
      const dest = [...(newOppData.graveyard || [])];
      cardsToMove.forEach(c => dest.push(c));
      newOppData.graveyard = dest;
    } else if (actionType === "hand") {
      const dest = [...(newOppData.hand || [])];
      cardsToMove.forEach(c => dest.push(c));
      newOppData.hand = dest;
    } else if (actionType === "mana") {
      const dest = [...(newOppData.manaZone || [])];
      cardsToMove.forEach(c => dest.push({ url: c, isTapped: false, isFaceDown: false, id: generateId() }));
      newOppData.manaZone = dest;
    } else if (actionType === "shield") {
      const dest = [...(newOppData.shields || [])];
      cardsToMove.forEach(c => dest.push(c));
      newOppData.shields = dest;
    } else if (actionType === "battle") {
       const dest = [...(newOppData.battleZone || [])];
       cardsToMove.forEach(c => dest.push({ url: c, isTapped: false, isFaceDown: false, stack: [], id: generateId() }));
       newOppData.battleZone = dest;
    } else if (actionType === "deck" || actionType === "deckTop") { // ★追加: 山札トップへ
       const dest = [...(newOppData.deck || [])];
       // 複数枚ある場合、順番をどうするか？とりあえずそのまま追加
       // unshift(...items) は逆順になるので、1つずつunshiftするか、逆順にしてunshiftするか。
       // cardsToMove = [A, B] -> deck = [A, B, ...] にしたいなら、逆順にしてunshift
       // ここではシンプルに1枚移動を想定しつつ、複数なら順番通りトップに乗せる
       // [A, B] -> [A, B, old...]
       newOppData.deck = [...cardsToMove, ...dest];
    } else if (actionType === "deckBottom") { // ★追加: 山札ボトムへ
       const dest = [...(newOppData.deck || [])];
       newOppData.deck = [...dest, ...cardsToMove];
    }

    await updateDoc(doc(db, "rooms", roomId), { [opponentRole]: newOppData });
  };

  return {
    selectedOpponentCard, setSelectedOpponentCard,
    interactionMode, setInteractionMode,
    handleOpponentInteract,
    executeOpponentAction,
    performOpponentActionDirect, // ドラッグ操作用に追加
    executeOpponentActionLogic,
    revealOpponentHand, // ★追加
    setRevealOpponentHand // ★追加
  };
};
