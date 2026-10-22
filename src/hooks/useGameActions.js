import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { showToast } from "../utils/toast";
import { getCardName } from "../utils/cardNames";
import { removeCardFromZone, addCardToZone, shuffle } from "../utils/zoneUtils";

export const useGameActions = (syncToDB, gameState, generateId, roomId) => {
  const {
    myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace,
    turn, turnSide, mySide, firstSide, isMyTurn, isSolo, setSoloSide, roomData, normalizeZone, addLog
  } = gameState;
  const log = (text) => { if (addLog) addLog(text); };

  const getZones = () => ({
    hand: [...myHand], battleZone: [...myBattleZone], manaZone: [...myManaZone],
    graveyard: [...myGraveyard], shields: [...myShields], deck: [...myDeck],
    tempZone: [...myTempZone], hyperspace: [...myHyperspace],
  });

  // --- カード移動ロジック ---
  const ZONE_LABELS = {
    hand: "手札", battle: "バトルゾーン", mana: "マナ", shield: "シールド", grave: "墓地",
    temp: "一時ゾーン", hyperspace: "超次元", deck: "山札", deckTop: "山札の上", deckBottom: "山札の下",
  };
  const VALID_TARGETS = ["hand", "battle", "mana", "shield", "grave", "temp", "hyperspace", "deckTop", "deckBottom"];

  const performMoveWithData = (sourceData, targetZoneName) => {
    // 想定外のドロップ先(相手エリアなど)だと、取り出すだけでカードが消えてしまうため先に弾く
    if (!VALID_TARGETS.includes(targetZoneName)) return;
    const { zone: fromZone, index: fromIndex } = sourceData;
    const zones = getZones();
    const { cardUrl, cardFaces } = removeCardFromZone(zones, fromZone, fromIndex);
    if (!cardUrl) return;
    addCardToZone(zones, targetZoneName, cardUrl, cardFaces, generateId);
    syncToDB(zones);

    // ログ: 公開ゾーンが絡む移動だけカード名を出す(手札・山札・シールド同士は枚数のみ)
    const PUBLIC = ["battle", "grave", "mana", "hyperspace"];
    const reveal = PUBLIC.includes(fromZone) || PUBLIC.includes(targetZoneName);
    const name = reveal ? (getCardName(cardUrl) || "カード") : "1枚";
    log(`${name}: ${ZONE_LABELS[fromZone] || fromZone} → ${ZONE_LABELS[targetZoneName] || targetZoneName}`);
  };

  // --- スタック (進化/封印) ---
  const performStack = (selectedCard, stackTarget, mode) => {
    if (!selectedCard || !stackTarget) return;
    const { zone: fromZone, index: fromIndex } = selectedCard;
    const { index: toIndex } = stackTarget;

    if (fromZone === "battle" && fromIndex === toIndex) return;

    const zones = getZones();
    if (!zones.battleZone[toIndex]) return;

    let cardUrl = "";
    let sourceStack = [];
    let sourceFaces = null;

    if (fromZone === "hand") { cardUrl = zones.hand[fromIndex]; zones.hand.splice(fromIndex, 1); }
    else if (fromZone === "battle") {
        const cardObj = zones.battleZone[fromIndex];
        cardUrl = cardObj.url;
        sourceStack = cardObj.stack || [];
        sourceFaces = cardObj.faces || null;
        zones.battleZone.splice(fromIndex, 1);
    } else if (fromZone === "mana") { cardUrl = zones.manaZone[fromIndex].url; zones.manaZone.splice(fromIndex, 1); }
    else if (fromZone === "grave") { cardUrl = zones.graveyard[fromIndex]; zones.graveyard.splice(fromIndex, 1); }
    else if (fromZone === "shield") { cardUrl = zones.shields[fromIndex]; zones.shields.splice(fromIndex, 1); }
    else if (fromZone === "hyperspace") {
        const hsCard = zones.hyperspace[fromIndex];
        cardUrl = typeof hsCard === 'object' ? hsCard.url : hsCard;
        sourceFaces = typeof hsCard === 'object' ? (hsCard.faces || null) : null;
        zones.hyperspace.splice(fromIndex, 1);
    }
    else if (fromZone === "deck") { cardUrl = zones.deck[fromIndex]; zones.deck.splice(fromIndex, 1); }
    else if (fromZone === "temp") { cardUrl = zones.tempZone[fromIndex].url; zones.tempZone.splice(fromIndex, 1); }

    if (!cardUrl) return;

    let adjustedToIndex = toIndex;
    if (fromZone === "battle" && fromIndex < toIndex) adjustedToIndex -= 1;

    let targetCard = { ...zones.battleZone[adjustedToIndex] };
    const oldTop = targetCard.url;
    const oldStack = targetCard.stack || [];

    if (mode === "evolve") {
      targetCard.url = cardUrl;
      targetCard.faces = sourceFaces;
      targetCard.stack = [oldTop, ...oldStack, ...sourceStack];
      targetCard.isTapped = false;
      targetCard.isFaceDown = false;
    } else if (mode === "under") {
      targetCard.stack = [...oldStack, cardUrl, ...sourceStack];
    } else if (mode === "seal") {
      targetCard.url = cardUrl;
      targetCard.faces = sourceFaces;
      targetCard.stack = [oldTop, ...oldStack, ...sourceStack];
      targetCard.isFaceDown = true;
    }

    zones.battleZone[adjustedToIndex] = targetCard;
    syncToDB(zones);
    const MODE_LABELS = { evolve: "進化(上に重ねる)", under: "下に入れる", seal: "封印" };
    log(`${getCardName(cardUrl) || "カード"}: ${MODE_LABELS[mode] || mode} → ${getCardName(oldTop) || "カード"}`);
  };

  // --- タップ状態トグル ---
  const toggleStatus = (selectedCard, type) => {
    if (!selectedCard) return;
    const { zone, index } = selectedCard;

    const isValid = (list, idx) => list && list.length > idx && list[idx];

    if (zone === "battle") {
      if (!isValid(myBattleZone, index)) return;
      const newZone = [...myBattleZone];
      if (type === "tap") newZone[index] = { ...newZone[index], isTapped: !newZone[index].isTapped };
      if (type === "face") newZone[index] = { ...newZone[index], isFaceDown: !newZone[index].isFaceDown };
      syncToDB({ battleZone: newZone });
    } else if (zone === "mana") {
      if (!isValid(myManaZone, index)) return;
      const newZone = [...myManaZone];
      if (type === "tap") newZone[index] = { ...newZone[index], isTapped: !newZone[index].isTapped };
      if (type === "face") newZone[index] = { ...newZone[index], isFaceDown: !newZone[index].isFaceDown };
      syncToDB({ manaZone: newZone });
    } else if (zone === "temp") {
      if (!isValid(myTempZone, index)) return;
      const newZone = [...myTempZone];
      if (type === "face") newZone[index] = { ...newZone[index], isFaceDown: !newZone[index].isFaceDown };
      syncToDB({ tempZone: newZone });
    }
  };

  const handleQuickTap = (zone, index) => {
    const isValid = (list, idx) => list && list.length > idx && list[idx];

    if (zone === "battle") {
      if (!isValid(myBattleZone, index)) return;
      const newZone = [...myBattleZone];
      newZone[index] = { ...newZone[index], isTapped: !newZone[index].isTapped };
      syncToDB({ battleZone: newZone });
    } else if (zone === "mana") {
      if (!isValid(myManaZone, index)) return;
      const newZone = [...myManaZone];
      newZone[index] = { ...newZone[index], isTapped: !newZone[index].isTapped };
      syncToDB({ manaZone: newZone });
    }
  };

  // --- ターン制御 ---
  const roomRef = () => doc(db, "rooms", roomId);

  // アンタップ+ドロー。src は盤面(手動は現在のstate、自動は最新のroomData)
  const runStartTurn = (src, { draw }) => {
    const newBattle = src.battleZone.map(c => ({ ...c, isTapped: false }));
    const newMana = src.manaZone.map(c => ({ ...c, isTapped: false }));
    let newDeck = [...src.deck];
    let newHand = [...src.hand];
    let drew = false;
    if (draw && newDeck.length > 0) {
      newHand.push(newDeck[0]);
      newDeck = newDeck.slice(1);
      drew = true;
    }
    syncToDB({
      ...src, battleZone: newBattle, manaZone: newMana, deck: newDeck, hand: newHand,
    });
    updateDoc(roomRef(), { startedTurn: turn }).catch((e) => console.error(e));
    log(`ターン${turn}開始${drew ? "(1枚ドロー)" : draw ? "(山札なし)" : "(先攻1ターン目はドローなし)"}`);
  };

  const currentSrc = () => ({
    hand: myHand, battleZone: myBattleZone, manaZone: myManaZone, graveyard: myGraveyard,
    hyperspace: myHyperspace, shields: myShields, deck: myDeck, tempZone: myTempZone,
  });

  // 先攻の最初のターンはドローしない
  const shouldDraw = () => !(turn === 1 && turnSide === firstSide);

  // 手動の「開始」ボタン
  const startTurn = () => {
    if (!isMyTurn && !isSolo) showToast("相手のターンです");
    // 自動開始済みのターンで押すと二重ドローになるため確認する
    if (roomData?.startedTurn === turn && !window.confirm("このターンはすでに開始済みです。もう一度開始しますか？")) return;
    runStartTurn(currentSrc(), { draw: shouldDraw() });
  };

  // 相手のターン終了を受けて自動で開始(最新のroomDataから読む)
  const autoStartTurn = () => {
    const d = roomData?.[mySide === "host" ? "hostData" : "guestData"];
    if (!d) return;
    const z = (v) => normalizeZone(v);
    runStartTurn({
      hand: d.hand || [], battleZone: z(d.battleZone), manaZone: z(d.manaZone), graveyard: d.graveyard || [],
      hyperspace: d.hyperspace || [], shields: d.shields || [], deck: d.deck || [], tempZone: z(d.tempZone),
    }, { draw: true });
  };

  const handleEndTurn = () => {
    if (!turnSide) { showToast("対戦相手が揃っていません"); return; }
    if (!isMyTurn && !isSolo) { showToast("あなたのターンではありません"); return; }
    const nextSide = turnSide === "host" ? "guest" : "host";
    log(`ターン${turn}終了`);
    updateDoc(roomRef(), { turn: turn + 1, turnSide: nextSide })
      .catch((e) => console.error("end turn failed:", e));
    if (isSolo && setSoloSide) setSoloSide(nextSide);
    showToast(`ターン${turn + 1}へ`);
  };

  // --- デッキ操作 ---
  const shuffleDeck = () => {
    if (myDeck.length <= 1) return;
    syncToDB({ deck: shuffle(myDeck) });
    showToast("山札をシャッフルしました");
    log("山札をシャッフル");
  };

  const drawCard = () => {
    if (myDeck.length === 0) return;
    const card = myDeck[0];
    const newDeck = myDeck.slice(1);
    const newHand = [...myHand, card];
    syncToDB({ deck: newDeck, hand: newHand });
    log("1枚ドロー");
  };

  const setupGame = () => {
    if (myDeck.length === 0 && myHand.length === 0) { showToast("デッキがありません"); return; }
    if (!window.confirm("ゲームを開始しますか？")) return;

    const allCards = [
      ...myDeck, ...myHand, ...myShields, ...myGraveyard, ...myTempZone.map(c => c.url),
      ...myBattleZone.flatMap(c => [c.url, ...(c.stack || [])]),
      ...myManaZone.map(c => c.url)
    ];
    if (allCards.length < 10) { showToast("カードが10枚未満です"); return; }

    const shuffled = shuffle(allCards);
    const newShields = shuffled.slice(0, 5);
    const newHand = shuffled.slice(5, 10);
    const newDeck = shuffled.slice(10);

    syncToDB({
      deck: newDeck, hand: newHand, shields: newShields,
      battleZone: [], manaZone: [], graveyard: [], tempZone: [],
      hyperspace: myHyperspace
    });
    // ターンを1に戻す(先攻側から)
    if (firstSide) {
      updateDoc(roomRef(), { turn: 1, turnSide: firstSide, startedTurn: null })
        .catch((e) => console.error("turn reset failed:", e));
    }
    log("ゲーム準備(シャッフル・シールド5・手札5)");
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
      if (index < 0 || index >= myBattleZone.length) return;
      const newZone = [...myBattleZone];
      newZone[index] = { ...newZone[index], url: newFaceUrl };
      syncToDB({ battleZone: newZone });
    } else if (zone === "hyperspace") {
      if (index < 0 || index >= myHyperspace.length) return;
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
    startTurn, autoStartTurn, handleEndTurn, shuffleDeck, drawCard, setupGame, toggleTempAll,
    changeFace
  };
};
