import { useState } from "react"; // useEffect削除
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"; // onSnapshot削除
import { getProxyImageUrl } from "../utils/apiConfig";

import { ZoneModal } from "../components/game/ZoneModal";
import { ActionMenu } from "../components/game/ActionMenu";
import { OpponentActionMenu } from "../components/game/OpponentActionMenu";
import { OpponentArea } from "../components/game/OpponentArea";
import { PlayerArea } from "../components/game/PlayerArea";
import { ChatSidebar } from "../components/game/ChatSidebar";
import { DragOverlay } from "../components/game/DragOverlay";

import { useGameSync } from "../hooks/useGameSync"; // ★追加

export default function GameTable() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  // --- 切り出したフックを使用 ---
  const {
    isHost, roomData, firstPlayerId,
    myHand, setMyHand,
    myBattleZone, setMyBattleZone,
    myManaZone, setMyManaZone,
    myShields, setMyShields,
    myGraveyard, setMyGraveyard,
    myDeck, setMyDeck,
    myTempZone, setMyTempZone,
    syncToDB,
    generateId, // フックから取得
    normalizeZone // ★追加
  } = useGameSync(roomId, user);

  // UI State
  const [selectedCard, setSelectedCard] = useState(null); 
  const [stackTarget, setStackTarget] = useState(null);
  const [zoomedUrl, setZoomedUrl] = useState(null);
  const [stackViewCards, setStackViewCards] = useState([]);
  const [viewMode, setViewMode] = useState(null);
  const [interactionMode, setInteractionMode] = useState(false);
  const [selectedOpponentCard, setSelectedOpponentCard] = useState(null);

  // --- ドラッグ & ドロップ用 ---
  const [draggingCard, setDraggingCard] = useState(null); // { data, initialOffset }
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const handleDragStart = (data, pos) => {
    // 既に選択中なら解除
    setSelectedCard(null); 
    // 山札(deck)からのドラッグ、または裏向きのカードならゴーストを裏向きにする
    const isFaceDown = data.zone === "deck" || data.zone === "shield" || (data.isFaceDown);
    setDraggingCard({ data, isFaceDown });
    setDragPos(pos);
  };

  const handleDragMove = (pos) => {
    setDragPos(pos);
  };

  const handleDragEnd = (data, pos) => {
    setDraggingCard(null);
    
    // ドロップ先の判定
    const element = document.elementFromPoint(pos.x, pos.y);
    if (!element) return;

    // data-zone-id を持つ親要素を探す
    const zoneElement = element.closest("[data-zone-id]");
    if (zoneElement) {
      const targetZone = zoneElement.getAttribute("data-zone-id");
      
      // ターゲットがバトルゾーンの場合、カードの上にドロップされたか判定
      if (targetZone === "battle") {
         const cardElement = element.closest("[data-index]");
         if (cardElement) {
           const targetIndex = parseInt(cardElement.getAttribute("data-index"), 10);
           
           // 自分自身へのドロップは無視
           if (data.zone === "battle" && data.index === targetIndex) return;

           // スタックメニューを表示 (dataはドラッグ元、targetIndexはドロップ先)
           // performStackのために一時的にselectedCardを偽装する（またはperformStackを改修する）
           // ここでは既存の仕組みに乗せるため、selectedCardをセットしてメニューを出す
           setSelectedCard({ zone: data.zone, index: data.index, data: data });
           setStackTarget({ index: targetIndex }); // dataは不要ならindexだけで
           return;
         }
      }

      // 自分自身へのドロップは無視
      if (data.zone === targetZone) return;

      performMoveWithData(data, targetZone);
    }
  };
  
  // performMoveのロジックを再利用できるように分離
  const performMoveWithData = (sourceData, targetZoneName) => {
    const { zone: fromZone, index: fromIndex } = sourceData;
    // ... (logic from performMove)
    
    let cardUrl = "";
    let cardObj = null;
    let newHand = [...myHand], newBattle = [...myBattleZone], newMana = [...myManaZone];
    let newGrave = [...myGraveyard], newShields = [...myShields], newDeck = [...myDeck], newTemp = [...myTempZone];

    // 取り出し
    if (fromZone === "hand") { cardUrl = newHand[fromIndex]; newHand.splice(fromIndex, 1); }
    else if (fromZone === "battle") { 
      cardObj = newBattle[fromIndex];
      cardUrl = cardObj.url;
      if (cardObj.stack && cardObj.stack.length > 0) {
        const nextCardUrl = cardObj.stack[0];
        const newStack = cardObj.stack.slice(1);
        newBattle[fromIndex] = { ...cardObj, url: nextCardUrl, stack: newStack, isTapped: false };
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

    // 追加
    const isTemp = targetZoneName === "temp";
    const newObj = { url: cardUrl, isTapped: false, isFaceDown: isTemp, stack: [], id: generateId() };
    
    if (targetZoneName === "battle") newBattle.push(newObj);
    else if (targetZoneName === "mana") newMana.push(newObj);
    else if (targetZoneName === "hand") newHand.push(cardUrl);
    else if (targetZoneName === "grave") newGrave.push(cardUrl);
    else if (targetZoneName === "shield") newShields.push(cardUrl);
    else if (targetZoneName === "deckTop") newDeck.unshift(cardUrl);
    else if (targetZoneName === "deckBottom") newDeck.push(cardUrl);
    else if (targetZoneName === "temp") newTemp.push(newObj);

    syncToDB({ hand: newHand, battleZone: newBattle, manaZone: newMana, graveyard: newGrave, shields: newShields, deck: newDeck, tempZone: newTemp });
  };
  
  // 既存のperformMoveも維持（互換性のため、またはメニュー操作用）
  const performMove = (targetZoneName) => {
    if (!selectedCard) return;
    performMoveWithData(selectedCard, targetZoneName);
    setSelectedCard(null);
    if (targetZoneName !== "temp" && selectedCard.zone !== "temp" && viewMode !== "temp") setViewMode(null);
  };






  // --- 相手への干渉 ---
  const handleOpponentInteract = (targetZone, index) => {
    setSelectedOpponentCard({ zone: targetZone, index });
  };

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
    }

    await updateDoc(doc(db, "rooms", roomId), { [opponentRole]: newOppData });
    setSelectedOpponentCard(null);
    setInteractionMode(false); // 完了したらモード解除
  };

  // --- ゲームロジック ---
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

    syncToDB({ deck: newDeck, hand: newHand, shields: newShields, battleZone: [], manaZone: [], graveyard: [], tempZone: [] });
    setSelectedCard(null);
  };

  // デッキトップ選択
  const handleDeckTap = () => {
    if (myDeck.length === 0) return;
    if (selectedCard && selectedCard.zone === "deck") {
       setSelectedCard(null);
       return;
    }
    // 選択状態にするだけで移動はしない
    setSelectedCard({ zone: "deck", index: 0, data: myDeck[0] });
  };

  // ドロー実行
  const drawCard = () => {
    if (myDeck.length === 0) return;
    const card = myDeck[0];
    const newDeck = myDeck.slice(1);
    const newHand = [...myHand, card];
    syncToDB({ deck: newDeck, hand: newHand });
    setSelectedCard(null);
  };

  const shuffleDeck = () => {
    if (myDeck.length <= 1) return;
    const newDeck = [...myDeck].sort(() => Math.random() - 0.5);
    syncToDB({ deck: newDeck });
    alert("山札をシャッフルしました");
    setSelectedCard(null);
  };

  const performStack = (mode) => {
    if (!selectedCard || !stackTarget) return;
    const { zone: fromZone, index: fromIndex } = selectedCard;
    const { index: toIndex } = stackTarget;
    
    // バトルゾーン同士で同じカードなら無視
    if (fromZone === "battle" && fromIndex === toIndex) return;

    let newHand = [...myHand], newBattle = [...myBattleZone], newMana = [...myManaZone];
    let newGrave = [...myGraveyard], newShields = [...myShields], newDeck = [...myDeck], newTemp = [...myTempZone];

    // --- 1. 元カードの取り出し ---
    let cardUrl = "";
    let sourceStack = [];

    if (fromZone === "hand") { 
        cardUrl = newHand[fromIndex]; 
        newHand.splice(fromIndex, 1); 
    } else if (fromZone === "battle") { 
        const cardObj = newBattle[fromIndex];
        cardUrl = cardObj.url;
        sourceStack = cardObj.stack || [];
        // バトルゾーンから移動する場合はカード全体を削除
        newBattle.splice(fromIndex, 1);
    } else if (fromZone === "mana") {
        const cardObj = newMana[fromIndex]; 
        cardUrl = cardObj.url; 
        newMana.splice(fromIndex, 1);
    } else if (fromZone === "grave") {
        cardUrl = newGrave[fromIndex]; 
        newGrave.splice(fromIndex, 1);
    } else if (fromZone === "deck") {
        cardUrl = newDeck[fromIndex]; 
        newDeck.splice(fromIndex, 1);
    } else if (fromZone === "temp") {
        const cardObj = newTemp[fromIndex]; 
        cardUrl = cardObj.url; 
        newTemp.splice(fromIndex, 1);
    }

    // --- 2. ターゲットへの適用 ---
    // バトルゾーンから抜いた場合、インデックスがずれる可能性があるため補正
    let adjustedToIndex = toIndex;
    if (fromZone === "battle" && fromIndex < toIndex) adjustedToIndex -= 1;
    
    let targetCard = { ...newBattle[adjustedToIndex] };
    const oldTop = targetCard.url;
    const oldStack = targetCard.stack || [];

    if (mode === "evolve") {
      // 進化・重ね（上）
      targetCard.url = cardUrl;
      targetCard.stack = [oldTop, ...oldStack, ...sourceStack];
      targetCard.isTapped = false; 
      targetCard.isFaceDown = false;
    } else if (mode === "under") {
      // 下に重ねる
      targetCard.stack = [...oldStack, cardUrl, ...sourceStack];
    } else if (mode === "seal") {
      // 封印
      targetCard.url = cardUrl;
      targetCard.stack = [oldTop, ...oldStack, ...sourceStack];
      targetCard.isFaceDown = true;
    }

    newBattle[adjustedToIndex] = targetCard;

    syncToDB({ 
        hand: newHand, battleZone: newBattle, manaZone: newMana, 
        graveyard: newGrave, shields: newShields, deck: newDeck, tempZone: newTemp 
    });
    setSelectedCard(null);
    setStackTarget(null);
  };

  const toggleStatus = (type) => {
    if (!selectedCard) return;
    const { zone, index } = selectedCard;
    if (zone === "battle") {
      const newZone = [...myBattleZone];
      if (type === "tap") newZone[index].isTapped = !newZone[index].isTapped;
      if (type === "face") newZone[index].isFaceDown = !newZone[index].isFaceDown;
      syncToDB({ battleZone: newZone });
    } else if (zone === "mana") {
      const newZone = [...myManaZone];
      if (type === "tap") newZone[index].isTapped = !newZone[index].isTapped;
      if (type === "face") newZone[index].isFaceDown = !newZone[index].isFaceDown;
      syncToDB({ manaZone: newZone });
    } else if (zone === "temp") {
      const newZone = [...myTempZone];
      if (type === "face") newZone[index].isFaceDown = !newZone[index].isFaceDown;
      syncToDB({ tempZone: newZone });
    }
    setSelectedCard(null);
  };

  const toggleTempAll = () => {
    if (myTempZone.length === 0) return;
    const currentStatus = myTempZone[0].isFaceDown;
    const newZone = myTempZone.map(card => ({ ...card, isFaceDown: !currentStatus }));
    syncToDB({ tempZone: newZone });
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
    setSelectedCard(null);
  };

  const handleEndTurn = async () => {
    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        text: "⚡ ターン終了",
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "Guest",
        createdAt: serverTimestamp()
      });
      setSelectedCard(null);
    } catch (error) {
      console.error("ターン終了ログ送信エラー:", error);
    }
  };

  // 即座にタップ状態を切り替える (バトル/マナ用)
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

  const handleCardTap = (e, zone, index, cardData) => {
    if (e) e.stopPropagation();
    if (selectedCard && selectedCard.zone === zone && selectedCard.index === index) { setSelectedCard(null); return; }
    
    // スタックターゲット設定（どのゾーンからでもバトルゾーンのカードをタップすれば重ねられるようにする）
    if (selectedCard && zone === "battle") { 
      setStackTarget({ index, data: cardData }); 
      return; 
    }

    if (selectedCard && selectedCard.zone !== zone) { performMove(zone); return; }
    setSelectedCard({ zone, index, data: cardData });
  };

  const handleZoneTap = (zoneName) => {
    if (selectedCard && selectedCard.zone !== zoneName) performMove(zoneName);
  };

  const getOpponent = () => isHost ? roomData?.guestData : roomData?.hostData;
  const opponent = getOpponent();

  const amIFirst = firstPlayerId === user?.uid;
  const turnInfo = firstPlayerId ? (amIFirst ? "あなたは【先攻】です" : "あなたは【後攻】です") : "対戦相手待ち...";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0a0a0a", color: "#e0e0e0", userSelect: "none", overflow: "hidden" }}>
      
      <ChatSidebar roomId={roomId} user={user} />
      
      <div style={{ 
        background: "#222", color: amIFirst ? "#ffdd57" : "#aaa", textAlign: "center", padding: "4px", 
        fontSize: "0.85rem", borderBottom: "1px solid #444", fontWeight: "bold"
      }}>
        {turnInfo}
      </div>

      {zoomedUrl && (
        <div onClick={() => setZoomedUrl(null)} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.9)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={getProxyImageUrl(zoomedUrl)} style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "10px" }} />
        </div>
      )}

      {viewMode === "deck" && <ZoneModal title="山札確認" cards={myDeck} zoneName="deck" selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}
      {viewMode === "grave" && <ZoneModal title="墓地確認" cards={myGraveyard} zoneName="grave" selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}
      {viewMode === "temp" && <ZoneModal title="一時ゾーン" cards={myTempZone} zoneName="temp" selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} onToggleFace={toggleTempAll} />}
      
      {viewMode === "opponentGrave" && (
        <ZoneModal 
          title="相手の墓地" 
          cards={opponent?.graveyard || []} 
          zoneName="opponentGrave" 
          selectedCard={null} 
          onClose={() => setViewMode(null)} 
          onCardTap={(e, z, i, cardUrl) => setZoomedUrl(cardUrl)} 
        />
      )}
      {viewMode === "opponentTemp" && (
        <ZoneModal 
          title="相手の一時ゾーン" 
          cards={opponent?.tempZone || []} 
          zoneName="opponentTemp" 
          selectedCard={null} 
          onClose={() => setViewMode(null)} 
          onCardTap={(e, z, i, cardData) => {
             // 伏せカードでなければ拡大
             const url = typeof cardData === 'object' ? cardData.url : cardData;
             const isFaceDown = typeof cardData === 'object' ? cardData.isFaceDown : false;
             if (!isFaceDown) setZoomedUrl(url);
          }} 
        />
      )}
      {viewMode === "stackView" && (
        <ZoneModal 
          title="重なっているカード" 
          cards={stackViewCards} 
          zoneName="stackView" 
          selectedCard={null} 
          onClose={() => setViewMode(null)} 
          onCardTap={(e, z, i, cardData) => {
             const url = typeof cardData === 'object' ? cardData.url : cardData;
             setZoomedUrl(url);
          }} 
        />
      )}

      {/* ドラッグ中のゴースト */}
      <DragOverlay draggingCard={draggingCard} currentPos={dragPos} />

      <OpponentArea 
        opponent={opponent} normalizeZone={normalizeZone} 
        onTapCard={(card) => {
           if (card.stack && card.stack.length > 0) {
             const allCards = [card.url, ...card.stack].map(u => ({ url: u, isFaceDown: false }));
             setStackViewCards(allCards);
             setViewMode("stackView");
           } else {
             setZoomedUrl(card.url);
           }
        }}
        interactionMode={interactionMode} onOpponentInteract={handleOpponentInteract}
        onOpenGrave={() => setViewMode("opponentGrave")}
        onOpenTemp={() => setViewMode("opponentTemp")} 
      />

      <PlayerArea 
        hand={myHand} battleZone={myBattleZone} manaZone={myManaZone} shields={myShields} graveyard={myGraveyard} deck={myDeck} tempZone={myTempZone}
        selectedCard={selectedCard} interactionMode={interactionMode}
        onZoneTap={handleZoneTap} 
        onCardTap={handleCardTap} 
        onQuickTap={handleQuickTap} 
        onDeckTap={handleDeckTap} 
        onDrawCard={drawCard}     
        onViewMode={setViewMode}
        onSetup={setupGame} onStartTurn={startTurn} onEndTurn={handleEndTurn} 
        onShuffle={shuffleDeck}
        onSetInteractionMode={setInteractionMode}
        // ★ドラッグ用ハンドラ追加
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />

      {/* 自分のカードメニュー */}
      {!stackTarget && !selectedOpponentCard && (
        <ActionMenu 
          selectedCard={selectedCard} 
          onZoom={(url) => setZoomedUrl(url)} 
          onMove={performMove} 
          onToggleStatus={toggleStatus} 
          onShuffle={shuffleDeck}
          onShowStack={(card) => {
            const allCards = [card.url, ...(card.stack || [])].map(u => ({ url: u, isFaceDown: false }));
            setStackViewCards(allCards);
            setViewMode("stackView");
            setSelectedCard(null);
          }}
          onClose={() => setSelectedCard(null)} 
        />
      )}

      {/* 相手カードメニュー */}
      {selectedOpponentCard && (
        <OpponentActionMenu 
          target={selectedOpponentCard}
          onClose={() => { setSelectedOpponentCard(null); setInteractionMode(false); }}
          onAction={executeOpponentAction}
        />
      )}

      {/* 重ねるメニュー */}
      {stackTarget && (
        <div style={{ 
          position: "absolute", top: "52%", left: "50%", transform: "translate(-50%, -50%)", 
          zIndex: 600, background: "rgba(0,0,0,0.95)", padding: "10px 15px", borderRadius: "8px", border: "1px solid #007bff", textAlign: "center", whiteSpace: "nowrap"
        }}>
          <p style={{margin: "0 0 10px 0", fontSize:"0.9rem"}}>重ねる</p>
          <div style={{display:"flex", gap:"10px"}}>
            <button className="btn btn-primary" onClick={() => performStack("evolve")} style={{fontSize:"0.8rem", padding:"5px 10px"}}>進化/上</button>
            <button className="btn btn-outline" onClick={() => performStack("under")} style={{fontSize:"0.8rem", padding:"5px 10px", borderColor:"#555"}}>下</button>
            <button className="btn btn-outline" onClick={() => performStack("seal")} style={{fontSize:"0.8rem", padding:"5px 10px", borderColor:"#ff6b6b", color:"#ff6b6b"}}>封印</button>
          </div>
          <button className="btn" onClick={() => setStackTarget(null)} style={{marginTop:"8px", width:"100%", background:"#333", padding:"4px", fontSize:"0.8rem"}}>キャンセル</button>
        </div>
      )}
    </div>
  );
}
