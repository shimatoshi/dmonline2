import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { removeCardFromZone, addCardToZone, shuffle } from "../utils/zoneUtils";

export const useGameActions = (syncToDB, gameState, generateId, roomId, user) => {
  const {
    myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace
  } = gameState;

  const getZones = () => ({
    hand: [...myHand], battleZone: [...myBattleZone], manaZone: [...myManaZone],
    graveyard: [...myGraveyard], shields: [...myShields], deck: [...myDeck],
    tempZone: [...myTempZone], hyperspace: [...myHyperspace],
  });

  // --- カード移動ロジック ---
  const performMoveWithData = (sourceData, targetZoneName) => {
    const { zone: fromZone, index: fromIndex } = sourceData;
    const zones = getZones();
    const { cardUrl, cardFaces } = removeCardFromZone(zones, fromZone, fromIndex);
    if (!cardUrl) return;
    addCardToZone(zones, targetZoneName, cardUrl, cardFaces, generateId);
    syncToDB(zones);
  };

  // --- スタック (進化/封印) ---
  const performStack = (selectedCard, stackTarget, mode) => {
    if (!selectedCard || !stackTarget) return;
    const { zone: fromZone, index: fromIndex } = selectedCard;
    const { index: toIndex } = stackTarget;

    if (fromZone === "battle" && fromIndex === toIndex) return;

    const zones = getZones();

    let cardUrl = "";
    let sourceStack = [];

    if (fromZone === "hand") { cardUrl = zones.hand[fromIndex]; zones.hand.splice(fromIndex, 1); }
    else if (fromZone === "battle") {
        const cardObj = zones.battleZone[fromIndex];
        cardUrl = cardObj.url;
        sourceStack = cardObj.stack || [];
        zones.battleZone.splice(fromIndex, 1);
    } else if (fromZone === "mana") { cardUrl = zones.manaZone[fromIndex].url; zones.manaZone.splice(fromIndex, 1); }
    else if (fromZone === "grave") { cardUrl = zones.graveyard[fromIndex]; zones.graveyard.splice(fromIndex, 1); }
    else if (fromZone === "hyperspace") {
        const hsCard = zones.hyperspace[fromIndex];
        cardUrl = typeof hsCard === 'object' ? hsCard.url : hsCard;
        zones.hyperspace.splice(fromIndex, 1);
    }
    else if (fromZone === "deck") { cardUrl = zones.deck[fromIndex]; zones.deck.splice(fromIndex, 1); }
    else if (fromZone === "temp") { cardUrl = zones.tempZone[fromIndex].url; zones.tempZone.splice(fromIndex, 1); }

    let adjustedToIndex = toIndex;
    if (fromZone === "battle" && fromIndex < toIndex) adjustedToIndex -= 1;

    let targetCard = { ...zones.battleZone[adjustedToIndex] };
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

    zones.battleZone[adjustedToIndex] = targetCard;
    syncToDB(zones);
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
    syncToDB({ deck: shuffle(myDeck) });
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

    const shuffled = shuffle(allCards);
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
