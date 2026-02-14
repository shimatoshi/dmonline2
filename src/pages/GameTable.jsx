import { useState } from "react"; // useEffect削除
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"; // onSnapshot削除
import { getProxyImageUrl } from "../utils/apiConfig";

import { GameModals } from "../components/game/GameModals"; // ★追加
import { ActionMenu } from "../components/game/ActionMenu";
import { StackMenu } from "../components/game/StackMenu"; // ★追加
import { OpponentActionMenu } from "../components/game/OpponentActionMenu";
import { OpponentArea } from "../components/game/OpponentArea";
import { PlayerArea } from "../components/game/PlayerArea";
import { ChatSidebar } from "../components/game/ChatSidebar";
import { DragOverlay } from "../components/game/DragOverlay";

import { useGameSync } from "../hooks/useGameSync";

import { useGameActions } from "../hooks/useGameActions";

import { useOpponentActions } from "../hooks/useOpponentActions";

import { useGameInteractions } from "../hooks/useGameInteractions"; // ★追加



export default function GameTable() {

  const { roomId } = useParams();

  const navigate = useNavigate();

  const user = auth.currentUser;



  // --- 切り出したフックを使用 ---

  const gameState = useGameSync(roomId, user);

    const {

      isHost, roomData, firstPlayerId,

      myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace,

      syncToDB, generateId, normalizeZone,

      setSoloSide, isSolo // ★追加

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



    



      const [zoomedUrl, setZoomedUrl] = useState(null);



    



      const [stackViewCards, setStackViewCards] = useState([]);



    



      const [viewMode, setViewMode] = useState(null);



    



      



    



      // --- インタラクションフック ---



    



      const {



    



        selectedCard, setSelectedCard,



    



        stackTarget, setStackTarget,



    



        draggingCard, dragPos,



    



        performMove,



    



        handleDragStart, handleDragMove, handleDragEnd,



    



        handleDeckTap, handleCardTap, handleZoneTap



    



      } = useGameInteractions({



    



        performMoveWithData,



    



        performOpponentActionDirect,



    



        interactionMode,



    



        setViewMode,



    



        myDeck,



    



        setStackViewCards,



    



        setZoomedUrl



    



      });



    



    



    



      const getOpponent = () => isHost ? roomData?.guestData : roomData?.hostData;

  const opponent = getOpponent();

  const amIFirst = firstPlayerId === user?.uid;

  const turnInfo = firstPlayerId ? (amIFirst ? "あなたは【先攻】です" : "あなたは【後攻】です") : "対戦相手待ち...";



  return (

    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0", userSelect: "none" }}>

      

      <ChatSidebar roomId={roomId} user={user} />

      

      <div style={{ 
        background: "#222", color: amIFirst ? "#ffdd57" : "#aaa", textAlign: "center", padding: "4px", 
        fontSize: "0.85rem", borderBottom: "1px solid #444", fontWeight: "bold",
        display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", position: "relative"
      }}>
                {turnInfo}
                
                {isSolo && (
                  <button 
                    onClick={() => setSoloSide(prev => prev === "host" ? "guest" : "host")}
                    style={{
                      background: "#007bff", color: "white", border: "none", borderRadius: "4px",
                      padding: "2px 8px", fontSize: "0.75rem", cursor: "pointer",
                      position: "absolute", right: "5px"
                    }}
                  >
                    視点切替
                  </button>
                )}
        
              </div>

        

        

        

              <GameModals 

                viewMode={viewMode}

                setViewMode={setViewMode}

                myDeck={myDeck}

                myGraveyard={myGraveyard}

                myHyperspace={myHyperspace}

                myTempZone={myTempZone}

                opponent={opponent}

                stackViewCards={stackViewCards}

                zoomedUrl={zoomedUrl}

                setZoomedUrl={setZoomedUrl}

                selectedCard={selectedCard}

                handleCardTap={handleCardTap}

                toggleTempAll={toggleTempAll}

              />

        

        

        

              <DragOverlay draggingCard={draggingCard} currentPos={dragPos} />



      <OpponentArea 
        opponent={opponent} normalizeZone={normalizeZone} 
        onTapCard={(card) => {
           if (!card) return;
           if (card.stack && Array.isArray(card.stack) && card.stack.length > 0) {
             setStackViewCards([card.url, ...card.stack].map(u => ({ url: u, isFaceDown: false })));
             setViewMode("stackView");
           } else {
             if (card.url) setZoomedUrl(card.url);
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



      <StackMenu 
        stackTarget={stackTarget}
        selectedCard={selectedCard}
        performStack={performStack}
        setStackTarget={setStackTarget}
        setSelectedCard={setSelectedCard}
      />



    </div>

  );

}

  
