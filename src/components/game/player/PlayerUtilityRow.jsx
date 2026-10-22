import { useRef } from "react";
import { DraggableCard } from "../DraggableCard";
import { getProxyImageUrl } from "../../../utils/apiConfig";

const CARD_BACK_URL = "/card_back.jpg";

const slideBtn = { flex: "0 0 auto", width: "18px", alignSelf: "stretch", background: "rgba(0,0,0,0.4)", color: "#fff", border: "none", padding: 0, fontSize: "0.7rem", cursor: "pointer" };

const CARD_W = "36px";
const CARD_H = "50px";

// 山上/山下へ置くためのドロップ先(山札・墓地の真下)
const Slot = ({ id, label }) => (
  <div data-zone-id={id} style={{
    width: CARD_W, height: "20px", marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "center",
    border: "1px dashed var(--border-color-light)", borderRadius: "var(--radius-sm)",
    background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)", fontSize: "0.65rem", whiteSpace: "nowrap"
  }}>{label}</div>
);

const Count = ({ n }) => (
  <span style={{ position: "absolute", bottom: "-12px", left: 0, right: 0, textAlign: "center", fontSize: "0.7rem", color: "var(--text-secondary)", pointerEvents: "none" }}>{n}</span>
);

export const PlayerUtilityRow = ({ 
  deck, hyperspace, graveyard, tempZone, shields,
  selectedCard, onViewMode, getDragProps
}) => {
  const shieldRef = useRef(null);
  const slide = (d) => shieldRef.current?.scrollBy({ left: d, behavior: "smooth" });
  const hTop = hyperspace[hyperspace.length - 1];

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", padding: "2px 6px 4px", background: "#111", flexShrink: 0, position: "relative" }}>

      {/* シールド (横一列・はみ出す分は横スクロール) */}
      <div style={{ display: "flex", alignItems: "center", gap: "3px", flex: "1 1 0", minWidth: 0 }}>
        <button style={slideBtn} onClick={() => slide(-80)}>◀</button>
        <div
          ref={shieldRef}
          className="zone-scroll"
          data-zone-id="shield"
          style={{
            display: "flex", gap: "3px", flexWrap: "nowrap", overflowX: "auto", flex: 1, minWidth: 0,
            alignItems: "center", minHeight: "44px", padding: "2px"
          }}
        >
          {shields.map((s, i) => (
            <DraggableCard key={i} {...getDragProps("shield", i, { url: s, isFaceDown: true })} style={{ flexShrink: 0 }}>
              <div style={{ width: "28px", height: "39px", cursor: "pointer" }}>
                <img src={CARD_BACK_URL} style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)", border: "1px solid #b8860b", boxShadow: selectedCard?.zone === "shield" && selectedCard?.index === i ? "0 0 0 2px yellow" : "none" }} />
              </div>
            </DraggableCard>
          ))}
        </div>
        <button style={slideBtn} onClick={() => slide(80)}>▶</button>
      </div>

      {/* 山札 (真下が山上) */}
      <div data-zone-id="deckTop" style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <DraggableCard {...getDragProps("deck", 0, deck.length > 0 ? { url: deck[0] } : {})} style={{ height: CARD_H }}>
          <div onClick={() => onViewMode("deck")} style={{ width: CARD_W, height: CARD_H, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", boxShadow: selectedCard?.zone === "deck" ? "0 0 8px 2px cyan" : "none" }}>
            {deck.length > 0
              ? <img src={CARD_BACK_URL} style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)" }} />
              : <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>山</span>}
            <Count n={deck.length} />
          </div>
        </DraggableCard>
        <Slot id="deckTop" label="山上" />
      </div>

      {/* 超次元 */}
      <div data-zone-id="hyperspace" style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <DraggableCard {...getDragProps("hyperspace", hyperspace.length - 1, hTop ? { url: typeof hTop === "object" ? hTop.url : hTop, faces: typeof hTop === "object" ? hTop.faces : null } : {})} style={{ height: CARD_H }}>
          <div onClick={() => onViewMode("hyperspace")} style={{ width: CARD_W, height: CARD_H, border: "1px dashed var(--info-color)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
            {hTop
              ? <img src={getProxyImageUrl(typeof hTop === "object" ? hTop.url : hTop)} style={{ width: "100%", height: "100%", opacity: 0.8 }} />
              : <span style={{ fontSize: "0.65rem", color: "var(--info-color)" }}>超</span>}
            <Count n={hyperspace.length} />
          </div>
        </DraggableCard>
      </div>

      {/* 墓地 (真下が山下) */}
      <div data-zone-id="grave" style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, position: "relative" }}>
        {/* 一時ゾーン: 右端・墓地の真上(バトルゾーンに重ねる) */}
        <div data-zone-id="temp" style={{ position: "absolute", bottom: "100%", right: 0, marginBottom: "4px", zIndex: 5, padding: "2px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", background: "rgba(30,20,50,0.85)" }}>
          <DraggableCard {...getDragProps("temp", tempZone.length - 1, tempZone.length > 0 ? tempZone[tempZone.length - 1] : {})} style={{ height: CARD_H }}>
            <div onClick={() => onViewMode("temp")} style={{ width: CARD_W, height: CARD_H, border: "2px dashed var(--purple-color)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", background: "#1a1a1a" }}>
              {tempZone.length > 0
                ? <img src={tempZone[tempZone.length - 1].isFaceDown ? CARD_BACK_URL : getProxyImageUrl(tempZone[tempZone.length - 1].url)} style={{ width: "100%", height: "100%", opacity: 0.8, pointerEvents: "none" }} />
                : <span style={{ fontSize: "0.7rem", color: "var(--purple-color)", pointerEvents: "none" }}>一時</span>}
              <Count n={tempZone.length} />
            </div>
          </DraggableCard>
        </div>

        <DraggableCard {...getDragProps("grave", graveyard.length - 1, graveyard.length > 0 ? { url: graveyard[graveyard.length - 1] } : {})} style={{ height: CARD_H }}>
          <div onClick={() => onViewMode("grave")} style={{ width: CARD_W, height: CARD_H, border: "1px dashed var(--border-color-light)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
            {graveyard.length > 0
              ? <img src={getProxyImageUrl(graveyard[graveyard.length - 1])} style={{ width: "100%", height: "100%", opacity: 0.8 }} />
              : <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>墓</span>}
            <Count n={graveyard.length} />
          </div>
        </DraggableCard>
        <Slot id="deckBottom" label="山下" />
      </div>
    </div>
  );
};
