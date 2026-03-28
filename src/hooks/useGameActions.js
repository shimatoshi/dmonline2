import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const useGameActions = (syncToDB, gameState, generateId, roomId, user) => {
  const { 
    myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace
  } = gameState;

  // --- カード移動ロジック ---
  const performMoveWithData = (sourceData, targetZoneName) => {
    const { zone: fromZone, index: fromIndex } = sourceData;

    let cardUrl = "";
    let cardObj = null;
    let cardFaces = null; // 超次元カードのfaces保持用
    let newHand = [...myHand], newBattle = [...myBattleZone], newMana = [...myManaZone];
    let newGrave = [...myGraveyard], newShields = [...myShields], newDeck = [...myDeck], newTemp = [...myTempZone];
    let newHyperspace = [...myHyperspace];

    // 取り出し
    if (fromZone === "hand") { cardUrl = newHand[fromIndex]; newHand.splice(fromIndex, 1); }
    else if (fromZone === "battle") {
      cardObj = newBattle[fromIndex];
      cardUrl = cardObj.url;
      cardFaces = cardObj.faces || null;
      if (cardObj.stack && cardObj.stack.length > 0) {
        const nextCardUrl = cardObj.stack[0];
        const newStack = cardObj.stack.slice(1);
        newBattle[fromIndex] = { ...cardObj, url: nextCardUrl, stack: newStack, isTapped: false, faces: null };
      } else {
        newBattle.splice(fromIndex, 1);
      }
    }
    else if (fromZone === "mana") { cardObj = newMana[fromIndex]; cardUrl = cardObj.url; newMana.splice(fromIndex, 1); }
    else if (fromZone === "shield") { cardUrl = newShields[fromIndex]; newShields.splice(fromIndex, 1); }
    else if (fromZone === "grave") { cardUrl = newGrave[fromIndex]; newGrave.splice(fromIndex, 1); }
    else if (fromZone === "deck") { cardUrl = newDeck[fromIndex]; newDeck.splice(fromIndex, 1); }
    else if (fromZone === "temp") {
      cardObj = newTemp[fromIndex];
      cardUrl = cardObj.url;
      newTemp.splice(fromIndex, 1);
    }
    else if (fromZone === "hyperspace") {
      const hsCard = newHyperspace[fromIndex];
      if (typeof hsCard === 'object') {
        cardUrl = hsCard.url;
        cardFaces = hsCard.faces || null;
      } else {
        cardUrl = hsCard;
      }
      newHyperspace.splice(fromIndex, 1);
    }

    if (!cardUrl && !cardObj) return;

    // 追加
    const isTemp = targetZoneName === "temp";
    const newObj = { url: cardUrl, isTapped: false, isFaceDown: isTemp, stack: [], id: generateId(), ...(cardFaces ? { faces: cardFaces } : {}) };

    if (targetZoneName === "battle") newBattle.push(newObj);
    else if (targetZoneName === "mana") newMana.push(newObj);
    else if (targetZoneName === "hand") newHand.push(cardUrl);
    else if (targetZoneName === "grave") newGrave.push(cardUrl);
    else if (targetZoneName === "shield") newShields.push(cardUrl);
    else if (targetZoneName === "deckTop") newDeck.unshift(cardUrl);
    else if (targetZoneName === "deckBottom") newDeck.push(cardUrl);
    else if (targetZoneName === "temp") newTemp.push(newObj);
    else if (targetZoneName === "hyperspace") {
      if (cardFaces) {
        newHyperspace.push({ url: cardUrl, faces: cardFaces });
      } else {
        newHyperspace.push(cardUrl);
      }
    }

    syncToDB({ 
      hand: newHand, battleZone: newBattle, manaZone: newMana, 
      graveyard: newGrave, shields: newShields, deck: newDeck, tempZone: newTemp,
      hyperspace: newHyperspace
    });
  };

  // --- スタック (進化/封印) ---
  const performStack = (selectedCard, stackTarget, mode) => {
    if (!selectedCard || !stackTarget) return;
    const { zone: fromZone, index: fromIndex } = selectedCard;
    const { index: toIndex } = stackTarget;
    
    if (fromZone === "battle" && fromIndex === toIndex) return;

    let newHand = [...myHand], newBattle = [...myBattleZone], newMana = [...myManaZone];
    let newGrave = [...myGraveyard], newShields = [...myShields], newDeck = [...myDeck], newTemp = [...myTempZone];
    let newHyperspace = [...myHyperspace];

    let cardUrl = "";
    let sourceStack = [];

    if (fromZone === "hand") { cardUrl = newHand[fromIndex]; newHand.splice(fromIndex, 1); }
    else if (fromZone === "battle") {
        const cardObj = newBattle[fromIndex];
        cardUrl = cardObj.url;
        sourceStack = cardObj.stack || [];
        newBattle.splice(fromIndex, 1);
    } else if (fromZone === "mana") { cardUrl = newMana[fromIndex].url; newMana.splice(fromIndex, 1); }
    else if (fromZone === "grave") { cardUrl = newGrave[fromIndex]; newGrave.splice(fromIndex, 1); }
    else if (fromZone === "hyperspace") {
        const hsCard = newHyperspace[fromIndex];
        cardUrl = typeof hsCard === 'object' ? hsCard.url : hsCard;
        newHyperspace.splice(fromIndex, 1);
    }
    else if (fromZone === "deck") { cardUrl = newDeck[fromIndex]; newDeck.splice(fromIndex, 1); }
    else if (fromZone === "temp") { cardUrl = newTemp[fromIndex].url; newTemp.splice(fromIndex, 1); }

    let adjustedToIndex = toIndex;
    if (fromZone === "battle" && fromIndex < toIndex) adjustedToIndex -= 1;
    
    let targetCard = { ...newBattle[adjustedToIndex] };
    const oldTop = targetCard.url;
    const oldStack = targetCard.stack || [];

    if (mode === "evolve") {
      targetCard.url = cardUrl;
      targetCard.stack = [oldTop, ...oldStack, ...sourceStack];
      targetCard.isTapped = false; 
      targetCard.isFaceDown = false;
    } else if (mode === "under") {
      targetCard.stack = [...oldStack, cardUrl, ...sourceStack];
    } else if (mode === "seal") {
      targetCard.url = cardUrl;
      targetCard.stack = [oldTop, ...oldStack, ...sourceStack];
      targetCard.isFaceDown = true;
    }

    newBattle[adjustedToIndex] = targetCard;

    syncToDB({ 
        hand: newHand, battleZone: newBattle, manaZone: newMana, 
        graveyard: newGrave, shields: newShields, deck: newDeck, tempZone: newTemp,
        hyperspace: newHyperspace
    });
  };

  // --- タップ状態トグル ---
  const toggleStatus = (selectedCard, type) => {
    if (!selectedCard) return;
    const { zone, index } = selectedCard;
    
    const isValid = (list, idx) => list && list.length > idx && list[idx];

    if (zone === "battle") {
      if (!isValid(myBattleZone, index)) return;
      const newZone = [...myBattleZone];
      if (type === "tap") newZone[index].isTapped = !newZone[index].isTapped;
      if (type === "face") newZone[index].isFaceDown = !newZone[index].isFaceDown;
      syncToDB({ battleZone: newZone });
    } else if (zone === "mana") {
      if (!isValid(myManaZone, index)) return;
      const newZone = [...myManaZone];
      if (type === "tap") newZone[index].isTapped = !newZone[index].isTapped;
      if (type === "face") newZone[index].isFaceDown = !newZone[index].isFaceDown;
      syncToDB({ manaZone: newZone });
    } else if (zone === "temp") {
      if (!isValid(myTempZone, index)) return;
      const newZone = [...myTempZone];
      if (type === "face") newZone[index].isFaceDown = !newZone[index].isFaceDown;
      syncToDB({ tempZone: newZone });
    }
  };

  const handleQuickTap = (zone, index) => {
    const isValid = (list, idx) => list && list.length > idx && list[idx];

    if (zone === "battle") {
      if (!isValid(myBattleZone, index)) return;
      const newZone = [...myBattleZone];
      newZone[index].isTapped = !newZone[index].isTapped;
      syncToDB({ battleZone: newZone });
    } else if (zone === "mana") {
      if (!isValid(myManaZone, index)) return;
      const newZone = [...myManaZone];
      newZone[index].isTapped = !newZone[index].isTapped;
      syncToDB({ manaZone: newZone });
    }
  };

  // --- ターン制御 ---
  const startTurn = () => {
    const newBattle = myBattleZone.map(c => ({ ...c, isTapped: false }));
    const newMana = myManaZone.map(c => ({ ...c, isTapped: false }));
    let newDeck = [...myDeck];
    let newHand = [...myHand];
    if (newDeck.length > 0) {
      newHand.push(newDeck[0]);
      newDeck = newDeck.slice(1);
    }
    syncToDB({ battleZone: newBattle, manaZone: newMana, deck: newDeck, hand: newHand });
  };

  const handleEndTurn = async () => {
    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        text: "⚡ ターン終了",
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "Guest",
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("ターン終了ログ送信エラー:", error);
    }
  };

  // --- デッキ操作 ---
  const shuffleDeck = () => {
    if (myDeck.length <= 1) return;
    const newDeck = [...myDeck].sort(() => Math.random() - 0.5);
    syncToDB({ deck: newDeck });
    alert("山札をシャッフルしました");
  };

  const drawCard = () => {
    if (myDeck.length === 0) return;
    const card = myDeck[0];
    const newDeck = myDeck.slice(1);
    const newHand = [...myHand, card];
    syncToDB({ deck: newDeck, hand: newHand });
  };

  const setupGame = () => {
    if (myDeck.length === 0 && myHand.length === 0) { alert("デッキがありません"); return; }
    if (!window.confirm("ゲームを開始しますか？")) return;

    const allCards = [
      ...myDeck, ...myHand, ...myShields, ...myGraveyard, ...myTempZone.map(c => c.url),
      ...myBattleZone.map(c => c.url), ...myManaZone.map(c => c.url)
    ];
    if (allCards.length < 10) { alert("カード不足"); return; }

    const shuffled = allCards.sort(() => Math.random() - 0.5);
    const newShields = shuffled.slice(0, 5);
    const newHand = shuffled.slice(5, 10);
    const newDeck = shuffled.slice(10);

    syncToDB({ 
      deck: newDeck, hand: newHand, shields: newShields, 
      battleZone: [], manaZone: [], graveyard: [], tempZone: [],
      hyperspace: myHyperspace
    });
  };

  const toggleTempAll = () => {
    if (myTempZone.length === 0) return;
    const currentStatus = myTempZone[0].isFaceDown;
    const newZone = myTempZone.map(card => ({ ...card, isFaceDown: !currentStatus }));
    syncToDB({ tempZone: newZone });
  };

  // --- 超次元カード：面チェンジ ---
  const changeFace = (selectedCard, newFaceUrl) => {
    if (!selectedCard) return;
    const { zone, index } = selectedCard;

    if (zone === "battle") {
      const newZone = [...myBattleZone];
      newZone[index] = { ...newZone[index], url: newFaceUrl };
      syncToDB({ battleZone: newZone });
    } else if (zone === "hyperspace") {
      const newZone = [...myHyperspace];
      const card = newZone[index];
      if (typeof card === 'object') {
        newZone[index] = { ...card, url: newFaceUrl };
      }
      syncToDB({ hyperspace: newZone });
    }
  };

  return {
    performMoveWithData, performStack, toggleStatus, handleQuickTap,
    startTurn, handleEndTurn, shuffleDeck, drawCard, setupGame, toggleTempAll,
    changeFace
  };
};