import { ZoneModal } from "./ZoneModal";
import { getProxyImageUrl } from "../../utils/apiConfig";

export const GameModals = ({
  viewMode,
  setViewMode,
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
  toggleTempAll
}) => {
  return (
    <>
      {zoomedUrl && (
        <div onClick={() => setZoomedUrl(null)} className="overlay overlay-dark" style={{ zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
    </>
  );
};
