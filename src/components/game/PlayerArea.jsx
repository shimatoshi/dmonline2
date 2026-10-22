import { SideControlMenu } from "./SideControlMenu";
import { PlayerHand } from "./player/PlayerHand";
import { PlayerBattleZone } from "./player/PlayerBattleZone";
import { PlayerManaZone } from "./player/PlayerManaZone";
import { PlayerUtilityRow } from "./player/PlayerUtilityRow";

export const PlayerArea = ({ 
  hand, battleZone, manaZone, shields, graveyard, deck, tempZone, hyperspace,
  selectedCard, interactionMode,
  onZoneTap, onCardTap, onQuickTap, onDeckTap, onDrawCard, onViewMode, 
  onUndo, canUndo, onSetup, onStartTurn, onEndTurn, onShuffle, onSetInteractionMode,
  onDragStart, onDragMove, onDragEnd 
}) => {
  
  // 共通のドラッグProps生成
  const getDragProps = (zone, index, data) => ({
    data: { zone, index, ...data },
    onDragStart,
    onDragMove,
    onDragEnd,
    onTap: () => {
      // バトル・マナはクイックタップで向きを変える
      if (zone === "battle" || zone === "mana") {
        onQuickTap(zone, index);
      } else if (zone === "hand") {
        // 手札はタップで拡大（または選択）
        onCardTap(null, zone, index, data);
      }
    },
    onLongPress: () => {
      // 全てのゾーンで長押しは詳細メニュー（選択状態にする）
      onCardTap(null, zone, index, data);
    }
  });

  return (
    <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", background: "var(--side-me-bg)", boxShadow: "inset 0 3px 0 var(--side-me-edge)", position: "relative" }}>
      
      <SideControlMenu  
        onShuffle={onShuffle}
        onViewTemp={() => onViewMode("temp")}
        onToggleInteract={() => onSetInteractionMode(!interactionMode)}
        interactionMode={interactionMode}
        tempZoneCount={tempZone.length}
      />

      {/* 右上：アクションボタン群 (セットアップ/終了/開始) */}
      <div style={{ position: "absolute", top: "-44px", right: "4px", zIndex: 10, display: "flex", gap: "6px" }}>
         <button className="btn btn-outline" onClick={onUndo} disabled={!canUndo} style={{ fontSize: "0.85rem", padding: "8px 10px", minHeight: "40px", border: "1px solid var(--text-secondary)", boxShadow: "0 2px 4px black", color: "white", opacity: canUndo ? 1 : 0.4 }}>↩ 戻す</button>
         <button className="btn btn-success" onClick={onSetup} title="ゲーム開始(盤面リセット)" style={{ fontSize: "0.85rem", padding: "8px 10px", minHeight: "40px", border: "1px solid var(--success-color)", boxShadow: "0 2px 4px black", color: "white", marginRight: "12px" }}>🎲準備</button>
         <button className="btn btn-danger" onClick={onEndTurn} style={{ fontSize: "0.85rem", padding: "8px 10px", minHeight: "40px", border: "1px solid #dc3545", boxShadow: "0 2px 4px black", color: "white" }}>🛑終了</button>
         <button className="btn btn-primary" onClick={onStartTurn} style={{ fontSize: "0.85rem", padding: "8px 10px", minHeight: "40px", border: "1px solid var(--accent-color)", boxShadow: "0 2px 4px black", color: "white" }}>⚡開始</button>
      </div>

      <PlayerBattleZone 
        battleZone={battleZone} 
        selectedCard={selectedCard} 
        onZoneTap={onZoneTap} 
        getDragProps={getDragProps} 
      />

      <PlayerUtilityRow 
        deck={deck} 
        hyperspace={hyperspace}
        graveyard={graveyard} 
        tempZone={tempZone} 
        shields={shields}
        selectedCard={selectedCard} 
        onViewMode={onViewMode} 
        onDeckTap={onDeckTap} 
        onZoneTap={onZoneTap} 
        getDragProps={getDragProps} 
      />

      <PlayerManaZone 
        manaZone={manaZone} 
        selectedCard={selectedCard} 
        onZoneTap={onZoneTap} 
        getDragProps={getDragProps} 
      />

      <PlayerHand 
        hand={hand} 
        selectedCard={selectedCard} 
        onZoneTap={onZoneTap} 
        getDragProps={getDragProps} 
      />
    </div>
  );
};