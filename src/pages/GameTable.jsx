import { useState, useEffect, useRef } from "react";
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
import { FaceSelector } from "../components/game/FaceSelector";
import { GameHint } from "../components/game/GameHint";
import { shouldShowHintFirst, markHintSeen } from "../utils/gameHint";

import { useGameSync } from "../hooks/useGameSync";
import { useGameActions } from "../hooks/useGameActions";
import { useOpponentActions } from "../hooks/useOpponentActions";
import { useGameInteractions } from "../hooks/useGameInteractions";
import { useGameLog } from "../hooks/useGameLog";
import { MultiActionPanel } from "../components/game/MultiActionPanel";
import { MultiSelectContext } from "../components/game/MultiSelectContext";
import { ActionBar } from "../components/game/ActionBar";
import { CardZoomOverlay } from "../components/game/CardZoomOverlay";
import { GameLogPanel } from "../components/game/GameLogPanel";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { ShieldFlowUI } from "../components/game/ShieldFlowUI";
import { AttackUI } from "../components/game/AttackUI";
import { ensureCardNames } from "../utils/cardNames";

export default function GameTable() {
  const { roomId } = useParams();
  const user = auth.currentUser;

  // --- フック ---
  const gameState = useGameSync(roomId, user);
  const {
    isHost, roomData, firstPlayerId,
    myHand, myBattleZone, myManaZone, myShields, myGraveyard, myDeck, myTempZone, myHyperspace,
    syncToDB, generateId, normalizeZone,
    setSoloSide, isSolo, undo, canUndo
  } = gameState;

  const { logs, addLog } = useGameLog(roomId, user, gameState.mySide);
  const {
    performMoveWithData, performMoveItems, performMoveMany, toggleStatusMany, performStack, toggleStatus, handleQuickTap,
    startTurn, autoStartTurn, handleEndTurn, shuffleDeck, drawCard, setupGame, toggleTempAll,
    changeFace
  } = useGameActions(syncToDB, { ...gameState, addLog }, generateId, roomId);
  const { turn, turnSide, mySide, isMyTurn } = gameState;

  const {
    selectedOpponentCard, setSelectedOpponentCard,
    interactionMode, setInteractionMode,
    handleOpponentInteract, executeOpponentAction,
    performOpponentActionDirect, moveOpponentMany,
    revealOpponentHand
  } = useOpponentActions(roomId, isHost, roomData, generateId);

  // UI State
  const [zoomedUrl, setZoomedUrl] = useState(null);
  const [stackViewCards, setStackViewCards] = useState([]);
  const [viewMode, setViewMode] = useState(null);
  // 盤面の複数選択 (選んだ順の {zone, index})
  const [multiMode, setMultiMode] = useState(false);
  const [picked, setPicked] = useState([]);
  const toggleMulti = () => { setMultiMode((m) => !m); setPicked([]); setSelectedCard(null); };
  const pickCard = (zone, index) => setPicked((cur) =>
    cur.some((p) => p.zone === zone && p.index === index)
      ? cur.filter((p) => !(p.zone === zone && p.index === index))
      : [...cur, { zone, index }]);
  const moveSelected = (target) => { performMoveItems(picked, target); setPicked([]); };
  const statusSelected = (type) => { toggleStatusMany(picked, type); setPicked([]); };

  // 一覧は同じボタンをもう一度押すと閉じる
  const toggleViewMode = (id) => setViewMode((cur) => (cur === id ? null : id));
  const [faceSelectCard, setFaceSelectCard] = useState(null);
  const [showHint, setShowHint] = useState(shouldShowHintFirst);
  const closeHint = () => { markHintSeen(); setShowHint(false); };
  const [showLog, setShowLog] = useState(false);

  useEffect(() => { ensureCardNames(); }, []);

  // 相手がターンを終えたら、自分のターン開始処理(アンタップ+ドロー)を自動で行う
  const autoStartedTurn = useRef(0);
  useEffect(() => {
    if (!roomData?.firstPlayerId || turn <= 1) return;
    if (turnSide !== mySide || roomData.startedTurn === turn) return;
    if (autoStartedTurn.current === turn) return;
    autoStartedTurn.current = turn;
    autoStartTurn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, turnSide, mySide, roomData?.startedTurn, roomData?.firstPlayerId]);

  // 攻撃: target(対象選択) → confirm(能力解決の確認) → resolving(解決中) → break(シールド選択)
  const [attack, setAttack] = useState(null);
  const startAttack = (idx, target) => {
    setSelectedCard(null);
    if (target) chooseTarget(target, idx);
    else setAttack({ phase: "target", idx, target: null, count: 1, picks: [] });
  };
  const chooseTarget = (target, idx = attack?.idx) => {
    const c = myBattleZone[idx];
    if (c && !c.isTapped) handleQuickTap("battle", idx);
    setAttack({ phase: "confirm", idx, target, count: 1, picks: [] });
    addLog && addLog(target.type === "player" ? "プレイヤーを攻撃" : "クリーチャーを攻撃");
  };
  const afterResolve = () => {
    if (attack?.target?.type === "player" && (opponent?.shields?.length || 0) > 0) {
      setAttack((a) => ({ ...a, phase: "break", picks: [] }));
    } else setAttack(null);
  };
  const answerResolve = (yes) => {
    if (yes) setAttack((a) => ({ ...a, phase: "resolving" })); else afterResolve();
  };
  const preBreak = () => setAttack((a) => ({ ...a, phase: "prebreak" }));
  const endPreBreak = () => setAttack((a) => ({ ...a, phase: "break" }));
  const setBreakCount = (n) => setAttack((a) => ({ ...a, count: n, picks: a.picks.slice(0, n) }));
  const toggleBreakPick = (i) => setAttack((a) => {
    if (a.picks.includes(i)) return { ...a, picks: a.picks.filter((x) => x !== i) };
    if (a.picks.length >= a.count) return a;
    return { ...a, picks: [...a.picks, i] };
  });
  const doBreak = () => {
    moveOpponentMany("shield", attack.picks, "hand");
    updateDoc(doc(db, "rooms", roomId), {
      shieldFlow: { id: generateId(), attackerSide: mySide, defenderSide: mySide === "host" ? "guest" : "host", count: attack.picks.length, phase: "ask" },
    }).catch((e) => console.error("shieldFlow failed:", e));
    addLog && addLog(`シールドを${attack.picks.length}枚ブレイク`);
    setAttack(null);
  };

  // シールド処理(双方で共有)。1人回しでは受ける側の視点へ自動で切り替える
  const shieldFlow = roomData?.shieldFlow || null;
  const flowId = shieldFlow?.id;
  useEffect(() => {
    if (isSolo && shieldFlow) setSoloSide(shieldFlow.defenderSide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);
  const answerShieldFlow = (yes) => {
    if (yes) updateDoc(doc(db, "rooms", roomId), { "shieldFlow.phase": "resolving" }).catch(() => {});
    else finishShieldFlow();
  };
  const finishShieldFlow = () => {
    if (isSolo && shieldFlow) setSoloSide(shieldFlow.attackerSide);
    updateDoc(doc(db, "rooms", roomId), { shieldFlow: null }).catch(() => {});
  };

  const {
    selectedCard, setSelectedCard,
    stackTarget, setStackTarget,
    draggingCard, dragPos,
    performMove,
    handleDragStart, handleDragMove, handleDragEnd,
    handleDeckTap, handleCardTap, handleZoneTap
  } = useGameInteractions({
    performMoveWithData, performOpponentActionDirect, interactionMode,
    setViewMode, myDeck, setStackViewCards, setZoomedUrl,
    onAttackStart: startAttack
  });

  const opponent = isHost ? roomData?.guestData : roomData?.hostData;
  const amIFirst = firstPlayerId === user?.uid;
  const turnInfo = firstPlayerId ? (amIFirst ? "あなたは【先攻】です" : "あなたは【後攻】です") : "対戦相手待ち...";

  const handleOpponentCardTap = (card, zone, index) => {
    if (!card) return;
    if (attack?.phase === "target" && zone === "battle") { chooseTarget({ type: "creature", index }); return; }
    if (attack?.phase === "break" && zone === "shield") { toggleBreakPick(index); return; }
    if (card.stack && Array.isArray(card.stack) && card.stack.length > 0) {
      setStackViewCards([card.url, ...card.stack].map(u => ({ url: u, isFaceDown: false })));
      setViewMode("stackView");
    } else {
      if (card.url) setZoomedUrl(card.url);
    }
  };

  return (
    <MultiSelectContext.Provider value={{ picked: multiMode ? picked : [] }}>
    <div style={{ display: "flex", flexDirection: "row", height: "calc(100dvh - 42px)", overflow: "hidden", background: "var(--bg-dark)", color: "var(--text-primary)", userSelect: "none" }}>
      <ChatSidebar roomId={roomId} user={user} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

      {/* ターン情報バー */}
      <div style={{
        background: "var(--surface-color-dark)", color: amIFirst ? "var(--turn-first)" : "var(--text-secondary)", textAlign: "center", padding: "4px",
        fontSize: "0.85rem", borderBottom: "1px solid var(--border-color-light)", fontWeight: "bold",
        display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", position: "relative"
      }}>
        <button
          onClick={() => setShowHint(true)}
          aria-label="操作のヒント"
          style={{ position: "absolute", left: "5px", background: "var(--border-color)", color: "#fff", border: "1px solid var(--border-color-dark)", borderRadius: "50%", width: "28px", height: "28px", fontSize: "0.85rem", cursor: "pointer" }}
        >?</button>
        <button
          onClick={() => setShowLog(true)}
          aria-label="対戦ログ"
          style={{ position: "absolute", left: "38px", background: "var(--border-color)", color: "#fff", border: "1px solid var(--border-color-dark)", borderRadius: "var(--radius-pill)", height: "28px", padding: "0 10px", fontSize: "0.8rem", cursor: "pointer" }}
        >📜ログ</button>
        {firstPlayerId ? (
          <span>
            ターン{turn}<span style={{ marginLeft: "10px" }}></span><span style={{ color: isMyTurn ? "#69f0ae" : "#ef9a9a" }}>{isMyTurn ? "あなたの番" : "相手の番"}</span>
            <span style={{ color: "var(--text-muted)", fontWeight: "normal", marginLeft: "8px" }}>手{myHand.length} 山{myDeck.length}</span>
          </span>
        ) : turnInfo}
        {isSolo && (
          <button
            onClick={() => setSoloSide(prev => prev === "host" ? "guest" : "host")}
            style={{
              background: "var(--accent-color)", color: "white", border: "none", borderRadius: "var(--radius-sm)",
              padding: "2px 8px", fontSize: "0.75rem", cursor: "pointer",
              position: "absolute", right: "5px"
            }}
          >
            視点切替
          </button>
        )}
      </div>

      {showHint && <GameHint onClose={closeHint} />}
      {showLog && <GameLogPanel logs={logs} mySide={mySide} onClose={() => setShowLog(false)} />}

      <GameModals
        viewMode={viewMode} setViewMode={setViewMode}
        myHand={myHand} myManaZone={myManaZone} myShields={myShields} myDeck={myDeck} myGraveyard={myGraveyard} myHyperspace={myHyperspace} myTempZone={myTempZone}
        opponent={opponent} stackViewCards={stackViewCards}
        zoomedUrl={zoomedUrl} setZoomedUrl={setZoomedUrl}
        selectedCard={selectedCard} handleCardTap={handleCardTap} toggleTempAll={toggleTempAll}
        moveMany={performMoveMany} moveOpponentMany={moveOpponentMany}
      />

      <FaceSelector
        faceSelectCard={faceSelectCard} selectedCard={selectedCard}
        changeFace={changeFace} onClose={() => setFaceSelectCard(null)} setSelectedCard={setSelectedCard}
      />

      <DragOverlay draggingCard={draggingCard} currentPos={dragPos} />
      <AttackUI
        attack={attack} draggingCard={draggingCard} dragPos={dragPos}
        shieldCount={opponent?.shields?.length || 0}
        onAttackPlayer={() => chooseTarget({ type: "player" })}
        onCancel={() => setAttack(null)} onAnswer={answerResolve}
        onFinishResolve={afterResolve} onSetCount={setBreakCount}
        onBreak={doBreak} onSkipBreak={() => setAttack(null)}
        onPreBreak={preBreak} onEndPreBreak={endPreBreak}
      />
      <ShieldFlowUI flow={shieldFlow} mySide={mySide} onAnswer={answerShieldFlow} onFinish={finishShieldFlow} />
      <CardZoomOverlay />

      <OpponentArea
        opponent={opponent} normalizeZone={normalizeZone}
        onTapCard={handleOpponentCardTap}
        interactionMode={interactionMode} onOpponentInteract={handleOpponentInteract}
        onOpenGrave={() => setViewMode("opponentGrave")}
        onOpenHyperspace={() => setViewMode("opponentHyperspace")}
        onOpenTemp={() => setViewMode("opponentTemp")}
        onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
        revealHand={revealOpponentHand}
        breakPicks={attack?.phase === "break" ? attack.picks : []}
      />

      <PlayerArea
        hand={myHand} battleZone={myBattleZone} manaZone={myManaZone} shields={myShields}
        graveyard={myGraveyard} deck={myDeck} tempZone={myTempZone} hyperspace={myHyperspace}
        selectedCard={selectedCard} multiMode={multiMode} onPick={pickCard}
        onZoneTap={handleZoneTap} onCardTap={handleCardTap} onQuickTap={handleQuickTap}
        onDeckTap={handleDeckTap}
        onViewMode={toggleViewMode}
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
          onChangeFace={(cardData) => setFaceSelectCard(cardData)}
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

      {multiMode && (
        <MultiActionPanel
          picked={picked} onMove={moveSelected} onToggleStatus={statusSelected}
          onClear={() => setPicked([])} onExit={toggleMulti}
        />
      )}

      <ActionBar
        onStartTurn={startTurn} onEndTurn={handleEndTurn} onDraw={drawCard} onShuffle={shuffleDeck}
        onUndo={undo} canUndo={canUndo} onSetup={setupGame}
        multiMode={multiMode} onToggleMulti={toggleMulti}
        counts={{ hand: myHand.length, deck: myDeck.length, grave: myGraveyard.length, hyperspace: myHyperspace.length, temp: myTempZone.length }}
        interactionMode={interactionMode} onToggleInteract={() => setInteractionMode(!interactionMode)}
        revealHand={viewMode === "opponentHand"} onToggleRevealHand={() => toggleViewMode("opponentHand")}
      />
    </div>
    </MultiSelectContext.Provider>
  );
}
