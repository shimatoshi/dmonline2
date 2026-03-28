/**
 * ゾーンデータ操作のユーティリティ
 * useGameActions / useOpponentActions で共通利用
 */

// ゾーン名からデータキーへのマッピング
const ZONE_KEY_MAP = {
  hand: "hand",
  battle: "battleZone",
  mana: "manaZone",
  shield: "shields",
  grave: "graveyard",
  deck: "deck",
  temp: "tempZone",
  hyperspace: "hyperspace",
};

/**
 * データオブジェクトの各ゾーンをコピーして返す
 */
export const cloneZones = (data) => ({
  hand: [...(data.hand || [])],
  battleZone: [...(data.battleZone || [])],
  manaZone: [...(data.manaZone || [])],
  shields: [...(data.shields || [])],
  graveyard: [...(data.graveyard || [])],
  deck: [...(data.deck || [])],
  tempZone: [...(data.tempZone || [])],
  hyperspace: [...(data.hyperspace || [])],
});

/**
 * 指定ゾーンからカードを取り出す
 * @returns {{ cardUrl, cardFaces, cardObj, zones }} 取り出したカード情報と更新後のゾーン
 */
export const removeCardFromZone = (zones, fromZone, fromIndex) => {
  let cardUrl = "";
  let cardObj = null;
  let cardFaces = null;

  const key = ZONE_KEY_MAP[fromZone];
  if (!key) return { cardUrl, cardObj, cardFaces, zones };

  const list = zones[key];

  if (fromZone === "hand" || fromZone === "shield" || fromZone === "grave" || fromZone === "deck") {
    cardUrl = list[fromIndex];
    list.splice(fromIndex, 1);
  } else if (fromZone === "battle") {
    cardObj = list[fromIndex];
    cardUrl = cardObj.url;
    cardFaces = cardObj.faces || null;
    if (cardObj.stack && cardObj.stack.length > 0) {
      const nextCardUrl = cardObj.stack[0];
      const newStack = cardObj.stack.slice(1);
      list[fromIndex] = { ...cardObj, url: nextCardUrl, stack: newStack, isTapped: false, faces: null };
    } else {
      list.splice(fromIndex, 1);
    }
  } else if (fromZone === "mana" || fromZone === "temp") {
    cardObj = list[fromIndex];
    cardUrl = cardObj.url;
    list.splice(fromIndex, 1);
  } else if (fromZone === "hyperspace") {
    const hsCard = list[fromIndex];
    if (typeof hsCard === "object") {
      cardUrl = hsCard.url;
      cardFaces = hsCard.faces || null;
    } else {
      cardUrl = hsCard;
    }
    list.splice(fromIndex, 1);
  }

  return { cardUrl, cardObj, cardFaces, zones };
};

/**
 * 指定ゾーンにカードを追加する
 */
export const addCardToZone = (zones, targetZone, cardUrl, cardFaces, generateId) => {
  const isTemp = targetZone === "temp";
  const newObj = {
    url: cardUrl, isTapped: false, isFaceDown: isTemp,
    stack: [], id: generateId(),
    ...(cardFaces ? { faces: cardFaces } : {}),
  };

  if (targetZone === "battle") zones.battleZone.push(newObj);
  else if (targetZone === "mana") zones.manaZone.push(newObj);
  else if (targetZone === "hand") zones.hand.push(cardUrl);
  else if (targetZone === "grave") zones.graveyard.push(cardUrl);
  else if (targetZone === "shield") zones.shields.push(cardUrl);
  else if (targetZone === "deckTop") zones.deck.unshift(cardUrl);
  else if (targetZone === "deckBottom") zones.deck.push(cardUrl);
  else if (targetZone === "temp") zones.tempZone.push(newObj);
  else if (targetZone === "hyperspace") {
    if (cardFaces) {
      zones.hyperspace.push({ url: cardUrl, faces: cardFaces });
    } else {
      zones.hyperspace.push(cardUrl);
    }
  }
};

/**
 * Fisher-Yatesシャッフル
 */
export const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
