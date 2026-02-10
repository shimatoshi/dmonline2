import { useState } from "react";

export const useGameActions = (syncToDB, gameState, generateId) => {
  const { 
    myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperZone 
  } = gameState;

  // 移動処理
  const performMoveWithData = (sourceData, targetZoneName) => {
    const { zone: fromZone, index: fromIndex } = sourceData;
    
    let newHand = [...myHand], newBattle = [...myBattleZone], newMana = [...myManaZone];
    let newGrave = [...myGraveyard], newShields = [...myShields], newDeck = [...myDeck], newTemp = [...myTempZone];
    let newHyper = [...myHyperZone];

    let cardUrl = "";
    let cardObj = null;

    // --- 取り出し ---
    if (fromZone === "hand") { 
        cardUrl = newHand[fromIndex]; 
        newHand.splice(fromIndex, 1); 
    } else if (fromZone === "battle") { 
        cardObj = newBattle[fromIndex];
        cardUrl = cardObj.url;
        // バトルゾーンから移動する場合はカード全体を削除 (Stackも)
        if (cardObj.stack && cardObj.stack.length > 0) {
            // Stackがある場合、一番上だけ剥がすか、全体を移動するか？
            // 既存ロジック: 「一番上を剥がす」 -> performMoveWithData は "Single card move" を想定
            // しかし、performMoveのロジックを見ると、Stackがある場合は「一番上を剥がして残りを更新」している。
            const nextCardUrl = cardObj.stack[0];
            const newStack = cardObj.stack.slice(1);
            newBattle[fromIndex] = { ...cardObj, url: nextCardUrl, stack: newStack, isTapped: false };
        } else {
            newBattle.splice(fromIndex, 1);
        }
    } else if (fromZone === "mana") {
        cardObj = newMana[fromIndex]; 
        cardUrl = cardObj.url; 
        newMana.splice(fromIndex, 1);
    } else if (fromZone === "grave") {
        cardUrl = newGrave[fromIndex]; 
        newGrave.splice(fromIndex, 1);
    } else if (fromZone === "deck") {
        cardUrl = newDeck[fromIndex]; 
        newDeck.splice(fromIndex, 1);
    } else if (fromZone === "temp") {
        cardObj = newTemp[fromIndex]; 
        cardUrl = cardObj.url; 
        newTemp.splice(fromIndex, 1);
    } else if (fromZone === "hyper") {
        cardObj = newHyper[fromIndex]; 
        cardUrl = cardObj.url; 
        newHyper.splice(fromIndex, 1); 
    } else if (fromZone === "shield") {
        cardUrl = newShields[fromIndex]; 
        newShields.splice(fromIndex, 1); 
    }

    // --- Safety Check ---
    // もしカードが取得できていなければ中止 (インデックス不整合や空ゾーンからの移動など)
    if (!cardUrl && !cardObj) {
      console.warn("Move aborted: Source card not found.", sourceData);
      return;
    }

    // --- 追加 ---
    const isTemp = targetZoneName === "temp" || targetZoneName === "hyper"; 
    // バトル・マナ・超次元・一時はオブジェクト、他はURL文字列（シールドはURLだが裏向き管理はPlayerArea側でやるか、ここでオブジェクトにするか？）
    // 既存ロジックではShieldsはURL配列。PlayerAreaで表示時にisFaceDownをつけている。
    
    const newObj = { url: cardUrl, isTapped: false, isFaceDown: isTemp, stack: [], id: generateId() };
    
    if (targetZoneName === "battle") newBattle.push(newObj);
    else if (targetZoneName === "mana") newMana.push(newObj);
    else if (targetZoneName === "hand") newHand.push(cardUrl);
    else if (targetZoneName === "grave") newGrave.push(cardUrl);
    else if (targetZoneName === "shield") newShields.push(cardUrl);
    else if (targetZoneName === "deckTop" || targetZoneName === "deck") newDeck.unshift(cardUrl); // "deck" 指定はとりあえずトップへ
    else if (targetZoneName === "deckBottom") newDeck.push(cardUrl);
    else if (targetZoneName === "temp") newTemp.push(newObj);
    else if (targetZoneName === "hyper") newHyper.push(newObj);

    syncToDB({ 
      hand: newHand, battleZone: newBattle, manaZone: newMana, 
      graveyard: newGrave, shields: newShields, deck: newDeck, 
      tempZone: newTemp, hyperZone: newHyper 
    });
  };

  // スタック（進化/封印）
  const performStack = (selectedCard, stackTarget, mode) => {
    if (!selectedCard || !stackTarget) return;
    const { zone: fromZone, index: fromIndex } = selectedCard;
    const { index: toIndex } = stackTarget;
    
    if (fromZone === "battle" && fromIndex === toIndex) return;

    let newHand = [...myHand], newBattle = [...myBattleZone], newMana = [...myManaZone];
    let newGrave = [...myGraveyard], newShields = [...myShields], newDeck = [...myDeck], newTemp = [...myTempZone];
    let newHyper = [...myHyperZone];

    let cardUrl = "";
    let sourceStack = [];

    // 元カード取得 (performMoveWithDataと同様だが、BattleZoneの場合は「丸ごと」移動する)
    if (fromZone === "battle") {
        const cardObj = newBattle[fromIndex];
        cardUrl = cardObj.url;
        sourceStack = cardObj.stack || [];
        newBattle.splice(fromIndex, 1);
    } else {
        // 他ゾーンからは1枚移動とみなす
        if (fromZone === "hand") { cardUrl = newHand[fromIndex]; newHand.splice(fromIndex, 1); }
        else if (fromZone === "mana") { cardUrl = newMana[fromIndex].url; newMana.splice(fromIndex, 1); }
        else if (fromZone === "grave") { cardUrl = newGrave[fromIndex]; newGrave.splice(fromIndex, 1); }
        else if (fromZone === "deck") { cardUrl = newDeck[fromIndex]; newDeck.splice(fromIndex, 1); }
        else if (fromZone === "temp") { cardUrl = newTemp[fromIndex].url; newTemp.splice(fromIndex, 1); }
        else if (fromZone === "hyper") { cardUrl = newHyper[fromIndex].url; newHyper.splice(fromIndex, 1); }
        else if (fromZone === "shield") { cardUrl = newShields[fromIndex]; newShields.splice(fromIndex, 1); }
    }

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
        graveyard: newGrave, shields: newShields, deck: newDeck, 
        tempZone: newTemp, hyperZone: newHyper 
    });
  };

  const handleQuickTap = (zone, index) => {
    if (zone === "battle") {
      const newZone = [...myBattleZone];
      newZone[index].isTapped = !newZone[index].isTapped;
      syncToDB({ battleZone: newZone });
    } else if (zone === "mana") {
      const newZone = [...myManaZone];
      newZone[index].isTapped = !newZone[index].isTapped;
      syncToDB({ manaZone: newZone });
    }
  };

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

  const shuffleDeck = () => {
    if (myDeck.length <= 1) return;
    const newDeck = [...myDeck].sort(() => Math.random() - 0.5);
    syncToDB({ deck: newDeck });
    alert("山札をシャッフルしました");
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

    syncToDB({ deck: newDeck, hand: newHand, shields: newShields, battleZone: [], manaZone: [], graveyard: [], tempZone: [], hyperZone: [] });
  };

  return {
    performMoveWithData, performStack, handleQuickTap, startTurn, shuffleDeck, setupGame
  };
};
