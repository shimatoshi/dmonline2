import { Zone } from "./Zone";
import { getProxyImageUrl } from "../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

export const OpponentArea = ({ 
  opponent, normalizeZone, onTapCard, interactionMode, onOpponentInteract, 
  onOpenGrave, onOpenTemp,
  onDragStart, onDragMove, onDragEnd,
  revealHand, onToggleRevealHand // ★追加
}) => {
  
  const getZoneDragProps = (zoneName) => (index, data) => ({
    data: { zone: zoneName, index, isOpponent: true, ...data },
    onDragStart,
    onDragMove,
    onDragEnd,
    // 干渉モード中でもタップではメニューを出さず、通常通りカード拡大などを優先する
    onTap: () => onTapCard(data),
    onLongPress: () => onTapCard(data)
  });

  const battleZone = normalizeZone(opponent?.battleZone);
  const manaZone = normalizeZone(opponent?.manaZone);
  
  // 相手の手札: revealHand が true なら絵柄を表示
  const handCards = (opponent?.hand || []).map((url, i) => ({ 
    url: url, 
    isFaceDown: !revealHand, 
    id: `opp-hand-${i}` 
  }));

  const shieldCards = [...Array(opponent?.shields?.length || 0)].map((_, i) => ({ 
    url: CARD_BACK_URL, 
    isFaceDown: true, 
    id: `opp-shield-${i}` 
  }));
  
  const graveCards = opponent?.graveyard || [];
  const tempCards = opponent?.tempZone || [];
  const deckCards = opponent?.deck || [];

  return (
    <div style={{ flex: 1, borderBottom: "1px solid #333", background: "#151515", display: "flex", flexDirection: "column", position: "relative" }}>
      
      {/* モード表示 & コントロール (邪魔にならない左上に固定) */}
      {interactionMode && (
        <div style={{
          position: "absolute", top: "5px", left: "5px", zIndex: 100, 
          display: "flex", flexDirection: "column", gap: "5px"
        }}>
          <div style={{
            background: "rgba(220, 53, 69, 0.9)", color: "white", fontSize: "0.6rem", 
            padding: "2px 8px", borderRadius: "4px", fontWeight: "bold", textAlign: "center"
          }}>
            干渉中
          </div>
          <button 
            onClick={onToggleRevealHand}
            style={{
              background: revealHand ? "#ffc107" : "#6c757d", border: "none", 
              color: "black", fontSize: "0.65rem", padding: "4px 6px", 
              borderRadius: "4px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
            }}
          >
            {revealHand ? "🙈 隠す" : "👁 見る"}
          </button>
        </div>
      )}

      {/* 手札・マナエリア */}
      <div style={{ padding: "5px", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
         <div style={{ width: "100%", transform: "rotate(180deg)" }}>
            <Zone 
                type="row" zoneId="opponent-hand" cards={handCards} cardSize={{ width: "30px", height: "42px" }}
                getDragProps={getZoneDragProps("hand")}
                isOpponent={true}
                revealHand={revealHand} // Zone側にも渡す
            />
         </div>

         <div style={{ width: "100%", transform: "rotate(180deg)" }}>
            <Zone 
                type="row" zoneId="opponent-mana" cards={manaZone} cardSize={{ width: "25px", height: "35px" }}
                getDragProps={getZoneDragProps("mana")}
                isOpponent={true}
            />
         </div>
      </div>
      
      {/* ミドルエリア */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", alignItems: "center", padding: "5px", transform: "rotate(180deg)" }}>
          <div onClick={onOpenGrave}>
             <Zone type="stack" zoneId="opponent-grave" cards={graveCards} cardSize={{ width: "40px", height: "56px" }} getDragProps={getZoneDragProps("grave")} isOpponent={true} />
          </div>
          
          {tempCards.length > 0 && (
            <div onClick={onOpenTemp}>
                <Zone type="stack" zoneId="opponent-temp" cards={tempCards} cardSize={{ width: "40px", height: "56px" }} getDragProps={getZoneDragProps("temp")} isOpponent={true} />
            </div>
          )}

          <div style={{ maxWidth: "200px" }}>
             <Zone type="row" zoneId="opponent-shield" cards={shieldCards} cardSize={{ width: "32px", height: "45px" }} getDragProps={getZoneDragProps("shield")} isOpponent={true} />
          </div>

          <div>
             <Zone type="stack" zoneId="opponent-deck" cards={deckCards} cardSize={{ width: "40px", height: "56px" }} getDragProps={getZoneDragProps("deck")} isOpponent={true} />
          </div>
      </div>

      {/* バトルゾーン */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", transform: "rotate(180deg)", borderTop: "1px dashed #333" }}>
         <Zone 
            type="grid" zoneId="opponent-battle" cards={battleZone} cardSize={{ width: "55px" }}
            getDragProps={getZoneDragProps("battle")}
            isOpponent={true}
         />
      </div>
    </div>
  );
};
