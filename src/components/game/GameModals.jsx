import { ZoneModal } from "./ZoneModal";
import { getProxyImageUrl } from "../../utils/apiConfig";

export const GameModals = ({
  viewMode,
  setViewMode,
  myHand,
  myDeck,
  myGraveyard,
  myHyperspace,
  myTempZone,
  opponent,
  stackViewCards,
  zoomedUrl,
  setZoomedUrl,
  selectedCard,
  handleCardTap,
  toggleTempAll,
  moveMany,
  moveOpponentMany
}) => {
  return (
    <>
      {zoomedUrl && (
        <div onClick={() => setZoomedUrl(null)} className="overlay overlay-dark" style={{ zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={getProxyImageUrl(zoomedUrl)} style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: "var(--radius-lg)" }} />
        </div>
      )}

      {viewMode === "hand" && <ZoneModal title="手札一覧" cards={myHand} zoneName="hand" onMoveMany={moveMany} selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}
      {viewMode === "deck" && <ZoneModal title="山札確認" cards={myDeck} zoneName="deck" onMoveMany={moveMany} selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}
      {viewMode === "grave" && <ZoneModal title="墓地確認" cards={myGraveyard} zoneName="grave" onMoveMany={moveMany} selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}
      {viewMode === "hyperspace" && <ZoneModal title="超次元ゾーン" cards={myHyperspace} zoneName="hyperspace" onMoveMany={moveMany} selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} />}
      {viewMode === "temp" && <ZoneModal title="一時ゾーン" cards={myTempZone} zoneName="temp" onMoveMany={moveMany} selectedCard={selectedCard} onClose={() => setViewMode(null)} onCardTap={handleCardTap} onToggleFace={toggleTempAll} />}
      
      {viewMode === "opponentHand" && (
        <ZoneModal title="相手の手札" cards={opponent?.hand || []} zoneName="hand" selectedCard={null} onMoveMany={moveOpponentMany} alwaysClose onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardUrl) => setZoomedUrl(typeof cardUrl === 'object' ? cardUrl.url : cardUrl)} />
      )}
      {viewMode === "opponentGrave" && (
        <ZoneModal title="相手の墓地" cards={opponent?.graveyard || []} zoneName="opponentGrave" selectedCard={null} onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardUrl) => setZoomedUrl(typeof cardUrl === 'object' ? cardUrl.url : cardUrl)} />
      )}
      {viewMode === "opponentHyperspace" && (
        <ZoneModal title="相手の超次元" cards={opponent?.hyperspace || []} zoneName="opponentHyperspace" selectedCard={null} onClose={() => setViewMode(null)} onCardTap={(e, z, i, cardUrl) => setZoomedUrl(typeof cardUrl === 'object' ? cardUrl.url : cardUrl)} />
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
    </>
  );
};
