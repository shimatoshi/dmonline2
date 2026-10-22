import { PlayerHand } from "./player/PlayerHand";
import { PlayerBattleZone } from "./player/PlayerBattleZone";
import { PlayerManaZone } from "./player/PlayerManaZone";
import { PlayerUtilityRow } from "./player/PlayerUtilityRow";

export const PlayerArea = ({ 
  hand, battleZone, manaZone, shields, graveyard, deck, tempZone, hyperspace,
  selectedCard, multiMode, onPick, freshIdx,
  onZoneTap, onCardTap, onQuickTap, onDeckTap, onViewMode,
  onDragStart, onDragMove, onDragEnd 
}) => {
  
  // 共通のドラッグProps生成
  const getDragProps = (zone, index, data) => ({
    data: { zone, index, ...data },
    onDragStart,
    onDragMove,
    onDragEnd,
    onTap: () => {
      // 複数選択中は、タップで選択に追加/解除する
      if (multiMode) {
        if (["hand", "battle", "mana", "shield", "temp"].includes(zone)) onPick(zone, index);
        return;
      }
      // バトル・マナはクイックタップで向きを変える
      if (zone === "battle" || zone === "mana") {
        onQuickTap(zone, index);
      } else if (zone === "hand") {
        // 手札はタップで拡大（または選択）
        onCardTap(null, zone, index, data);
      }
    }
  });

  return (
    <div style={{ flex: "1 1 0", minHeight: 0, display: "flex", flexDirection: "column", background: "var(--side-me-bg)", boxShadow: "inset 0 3px 0 var(--side-me-edge)", position: "relative" }}>
      
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
        onViewMode={onViewMode}
        manaZone={manaZone} 
        selectedCard={selectedCard} 
        onZoneTap={onZoneTap} 
        getDragProps={getDragProps} 
      />

      <PlayerHand 
        freshIdx={freshIdx}
        onViewMode={onViewMode}
        hand={hand} 
        selectedCard={selectedCard} 
        onZoneTap={onZoneTap} 
        getDragProps={getDragProps} 
      />
    </div>
  );
};