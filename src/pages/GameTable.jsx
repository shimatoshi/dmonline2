import { useState } from "react";
import { useParams } from "react-router-dom";
import { auth } from "../firebase";

import { GameModals } from "../components/game/GameModals";
import { ActionMenu } from "../components/game/ActionMenu";
import { StackMenu } from "../components/game/StackMenu";
import { OpponentActionMenu } from "../components/game/OpponentActionMenu";
import { OpponentArea } from "../components/game/OpponentArea";
import { PlayerArea } from "../components/game/PlayerArea";
import { ChatSidebar } from "../components/game/ChatSidebar";
import { DragOverlay } from "../components/game/DragOverlay";

import { useGameSync } from "../hooks/useGameSync";
import { useGameActions } from "../hooks/useGameActions";
import { useOpponentActions } from "../hooks/useOpponentActions";
import { useGameInteractions } from "../hooks/useGameInteractions";

export default function GameTable() {
  const { roomId } = useParams();
  const user = auth.currentUser;

  // ゲーム状態
  const gameState = useGameSync(roomId, user);
  const {
    isHost, roomData, firstPlayerId,
    myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace,
    myGRZone, myForbiddenCard,
    syncToDB, generateId, normalizeZone,
    setSoloSide, isSolo
  } = gameState;

  // アクション
  const {
    performMoveWithData, performStack, toggleStatus, handleQuickTap,
    startTurn, handleEndTurn, shuffleDeck, drawCard, setupGame, toggleTempAll
  } = useGameActions(syncToDB, gameState, generateId, roomId, user);

  // 相手への干渉
  const {
    selectedOpponentCard, setSelectedOpponentCard,
    interactionMode, setInteractionMode,
    handleOpponentInteract, executeOpponentAction,
    performOpponentActionDirect,
    revealOpponentHand, setRevealOpponentHand
  } = useOpponentActions(roomId, isHost, roomData, generateId);

  // UI State
  const [zoomedUrl, setZoomedUrl] = useState(null);
  const [stackViewCards, setStackViewCards] = useState([]);
  const [viewMode, setViewMode] = useState(null);

  // インタラクション
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

  const opponent = isHost ? roomData?.guestData : roomData?.hostData;
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
            style={{ background: "#007bff", color: "white", border: "none", borderRadius: "4px", padding: "2px 8px", fontSize: "0.75rem", cursor: "pointer", position: "absolute", right: "5px" }}
          >
            視点切替
          </button>
        )}
      </div>

      <GameModals
        viewMode={viewMode} setViewMode={setViewMode}
        myDeck={myDeck} myGraveyard={myGraveyard} myHyperspace={myHyperspace} myGRZone={myGRZone} myTempZone={myTempZone}
        opponent={opponent} stackViewCards={stackViewCards}
        zoomedUrl={zoomedUrl} setZoomedUrl={setZoomedUrl}
        selectedCard={selectedCard} handleCardTap={handleCardTap} toggleTempAll={toggleTempAll}
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
        onOpenGRZone={() => setViewMode("opponentGRZone")}
        onOpenTemp={() => setViewMode("opponentTemp")}
        onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
        revealHand={revealOpponentHand}
        onToggleRevealHand={() => setRevealOpponentHand(!revealOpponentHand)}
      />

      <PlayerArea
        hand={myHand} battleZone={myBattleZone} manaZone={myManaZone} shields={myShields}
        graveyard={myGraveyard} deck={myDeck} tempZone={myTempZone} hyperspace={myHyperspace} grZone={myGRZone}
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
        stackTarget={stackTarget} selectedCard={selectedCard}
        performStack={performStack} setStackTarget={setStackTarget} setSelectedCard={setSelectedCard}
      />
    </div>
  );
}
