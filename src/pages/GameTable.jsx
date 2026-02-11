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

import { useGameSync } from "../hooks/useGameSync";

import { useGameActions } from "../hooks/useGameActions";

import { useOpponentActions } from "../hooks/useOpponentActions"; // ★追加



export default function GameTable() {

  const { roomId } = useParams();

  const navigate = useNavigate();

  const user = auth.currentUser;



  // --- 切り出したフックを使用 ---

  const gameState = useGameSync(roomId, user);

    const {

      isHost, roomData, firstPlayerId,

      myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace,

      syncToDB, generateId, normalizeZone

    } = gameState;



  // --- アクションロジックフック ---

  const {

    performMoveWithData, performStack, toggleStatus, handleQuickTap,

    startTurn, handleEndTurn, shuffleDeck, drawCard, setupGame, toggleTempAll

  } = useGameActions(syncToDB, gameState, generateId, roomId, user);



    // --- 相手への干渉フック ---



    const {



      selectedOpponentCard, setSelectedOpponentCard,



      interactionMode, setInteractionMode,



      handleOpponentInteract, executeOpponentAction,



      performOpponentActionDirect, // ドラッグ用



      revealOpponentHand, setRevealOpponentHand // ★追加



    } = useOpponentActions(roomId, isHost, roomData, generateId);



  



    // UI State

  const [selectedCard, setSelectedCard] = useState(null); 

  const [stackTarget, setStackTarget] = useState(null);

  const [zoomedUrl, setZoomedUrl] = useState(null);

  const [stackViewCards, setStackViewCards] = useState([]);

  const [viewMode, setViewMode] = useState(null);

  

  // interactionMode, selectedOpponentCard はフックへ移動



  // --- ドラッグ & ドロップ用 ---

  const [draggingCard, setDraggingCard] = useState(null); 

  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });



  // 互換性のためのラッパー

  const performMove = (targetZoneName) => {

    if (!selectedCard) return;

    performMoveWithData(selectedCard, targetZoneName);

    setSelectedCard(null);

    if (targetZoneName !== "temp" && selectedCard.zone !== "temp" && viewMode !== "temp") setViewMode(null);

  };



  const handleDragStart = (data, pos) => {

    setSelectedCard(null); 

    const isFaceDown = data.zone === "deck" || data.zone === "shield" || (data.isFaceDown);

    setDraggingCard({ data, isFaceDown });

    setDragPos(pos);

  };



  const handleDragMove = (pos) => setDragPos(pos);



    const handleDragEnd = (data, pos) => {



      setDraggingCard(null);



      const element = document.elementFromPoint(pos.x, pos.y);



      if (!element) return;



  



      const zoneElement = element.closest("[data-zone-id]");



      if (zoneElement) {



        const targetZone = zoneElement.getAttribute("data-zone-id");



        



        // ★相手への干渉ドロップ (interactionModeがONのときのみ)



        if (data.isOpponent && interactionMode) {



          if (targetZone.startsWith("opponent-")) {



             const actionType = targetZone.replace("opponent-", "");



             // battle, mana, hand, grave, shield など



             performOpponentActionDirect(data.zone, data.index, actionType);



          }



          return;



        }



  



        // ターゲットがバトルゾーンの場合、カードの上にドロップされたか判定



        if (targetZone === "battle") {



           const cardElement = element.closest("[data-index]");



           if (cardElement) {



             const targetIndex = parseInt(cardElement.getAttribute("data-index"), 10);



             if (data.zone === "battle" && data.index === targetIndex) return;



             setSelectedCard({ zone: data.zone, index: data.index, data: data });



             setStackTarget({ index: targetIndex });



             return;



           }



        }



        if (data.zone === targetZone) return;



        performMoveWithData(data, targetZone);



      }



    };

  

  



  const handleDeckTap = () => {

    if (myDeck.length === 0) return;

    if (selectedCard && selectedCard.zone === "deck") { setSelectedCard(null); return; }

    setSelectedCard({ zone: "deck", index: 0, data: myDeck[0] });

  };



  const handleCardTap = (e, zone, index, cardData) => {

    if (e) e.stopPropagation();

    if (selectedCard && selectedCard.zone === zone && selectedCard.index === index) { setSelectedCard(null); return; }

    if (selectedCard && zone === "battle") { setStackTarget({ index, data: cardData }); return; }

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



            {viewMode === "hyperspace" && <ZoneModal title="超次元ゾーン" cards={myHyperspace} zoneName="hyperspace" selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}



            {viewMode === "temp" && <ZoneModal title="一時ゾーン" cards={myTempZone} zoneName="temp" selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} onToggleFace={toggleTempAll} />}

      

            {viewMode === "opponentGrave" && (

      

              <ZoneModal title="相手の墓地" cards={opponent?.graveyard || []} zoneName="opponentGrave" selectedCard={null} onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardUrl) => setZoomedUrl(cardUrl)} />

      

            )}

      

            {viewMode === "opponentHyperspace" && (

      

              <ZoneModal title="相手の超次元" cards={opponent?.hyperspace || []} zoneName="opponentHyperspace" selectedCard={null} onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardUrl) => setZoomedUrl(cardUrl)} />

      

            )}

      

            {viewMode === "opponentTemp" && (

        <ZoneModal title="相手の一時ゾーン" cards={opponent?.tempZone || []} zoneName="opponentTemp" selectedCard={null} onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardData) => {

             const url = typeof cardData === 'object' ? cardData.url : cardData;

             if (!cardData.isFaceDown) setZoomedUrl(url);

        }} />

      )}

      {viewMode === "stackView" && (

        <ZoneModal title="重なっているカード" cards={stackViewCards} zoneName="stackView" selectedCard={null} onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardData) => setZoomedUrl(typeof cardData === 'object' ? cardData.url : cardData)} />

      )}



      <DragOverlay draggingCard={draggingCard} currentPos={dragPos} />



      <OpponentArea 
        opponent={opponent} normalizeZone={normalizeZone} 
        onTapCard={(card) => {
           if (card.stack && card.stack.length > 0) {
             setStackViewCards([card.url, ...card.stack].map(u => ({ url: u, isFaceDown: false })));
             setViewMode("stackView");
           } else {
             setZoomedUrl(card.url);
           }
        }}
        interactionMode={interactionMode} onOpponentInteract={handleOpponentInteract}
        onOpenGrave={() => setViewMode("opponentGrave")}
        onOpenHyperspace={() => setViewMode("opponentHyperspace")}
        onOpenTemp={() => setViewMode("opponentTemp")}
        // ★ドラッグ用ハンドラ追加
        onDragStart={handleDragStart} 
        onDragMove={handleDragMove} 
        onDragEnd={handleDragEnd}
        // ★手札公開用
        revealHand={revealOpponentHand}
        onToggleRevealHand={() => setRevealOpponentHand(!revealOpponentHand)}
      />



                  <PlayerArea 



                    hand={myHand} battleZone={myBattleZone} manaZone={myManaZone} shields={myShields} graveyard={myGraveyard} deck={myDeck} tempZone={myTempZone} hyperspace={myHyperspace}



                    selectedCard={selectedCard} interactionMode={interactionMode}



                    onZoneTap={handleZoneTap} onCardTap={handleCardTap} onQuickTap={handleQuickTap} onDeckTap={handleDeckTap} onDrawCard={drawCard}     



                    onViewMode={setViewMode}



                    onSetup={setupGame} onStartTurn={startTurn} onEndTurn={handleEndTurn} 



                    onShuffle={shuffleDeck}



                    onSetInteractionMode={setInteractionMode}



                    onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}



                  />



      {!stackTarget && !selectedOpponentCard && (

        <ActionMenu 

          selectedCard={selectedCard} 

          onZoom={(url) => setZoomedUrl(url)} 

          onMove={performMove} 

          onToggleStatus={(type) => { toggleStatus(selectedCard, type); setSelectedCard(null); }} 

          onShuffle={shuffleDeck}

          onShowStack={(card) => {

            setStackViewCards([card.url, ...(card.stack || [])].map(u => ({ url: u, isFaceDown: false })));

            setViewMode("stackView");

            setSelectedCard(null);

          }}

          onClose={() => setSelectedCard(null)} 

        />

      )}



      {selectedOpponentCard && (

        <OpponentActionMenu 

          target={selectedOpponentCard}

          onClose={() => { setSelectedOpponentCard(null); setInteractionMode(false); }}

          onAction={executeOpponentAction}

        />

      )}



      {stackTarget && (

        <div style={{ 

          position: "absolute", top: "52%", left: "50%", transform: "translate(-50%, -50%)", 

          zIndex: 600, background: "rgba(0,0,0,0.95)", padding: "10px 15px", borderRadius: "8px", border: "1px solid #007bff", textAlign: "center", whiteSpace: "nowrap"

        }}>

          <p style={{margin: "0 0 10px 0", fontSize:"0.9rem"}}>重ねる</p>

          <div style={{display:"flex", gap:"10px"}}>

            <button className="btn btn-primary" onClick={() => { performStack(selectedCard, stackTarget, "evolve"); setSelectedCard(null); setStackTarget(null); }} style={{fontSize:"0.8rem", padding:"5px 10px"}}>進化/上</button>

            <button className="btn btn-outline" onClick={() => { performStack(selectedCard, stackTarget, "under"); setSelectedCard(null); setStackTarget(null); }} style={{fontSize:"0.8rem", padding:"5px 10px", borderColor:"#555"}}>下</button>

            <button className="btn btn-outline" onClick={() => { performStack(selectedCard, stackTarget, "seal"); setSelectedCard(null); setStackTarget(null); }} style={{fontSize:"0.8rem", padding:"5px 10px", borderColor:"#ff6b6b", color:"#ff6b6b"}}>封印</button>

          </div>

          <button className="btn" onClick={() => setStackTarget(null)} style={{marginTop:"8px", width:"100%", background:"#333", padding:"4px", fontSize:"0.8rem"}}>キャンセル</button>

        </div>

      )}

    </div>

  );

}

  
