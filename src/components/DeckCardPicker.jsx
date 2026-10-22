import { useState, useMemo, useRef } from "react";
import { getProxyImageUrl } from "../utils/apiConfig";

const CIVILS = [
  { name: "火", bg: "#e53935", fg: "#fff" },
  { name: "水", bg: "#1e88e5", fg: "#fff" },
  { name: "自然", bg: "#43a047", fg: "#fff" },
  { name: "光", bg: "#fdd835", fg: "#000" },
  { name: "闇", bg: "#6a1b9a", fg: "#fff" },
  { name: "ゼロ", bg: "#9e9e9e", fg: "#000" },
];
const COSTS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10+"];

const chipStyle = (active, bg = "#007bff", fg = "#fff") => ({
  flexShrink: 0, minWidth: "40px", minHeight: "36px", padding: "4px 10px", borderRadius: "18px",
  border: active ? "2px solid #fff" : "1px solid #555",
  background: active ? bg : "#2c2c2c", color: active ? fg : "#ccc",
  fontSize: "0.85rem", fontWeight: active ? "bold" : "normal", cursor: "pointer",
});

// 長押しでプレビュー、タップで追加
function Tile({ card, count, onAdd, onPreview }) {
  const timer = useRef(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => { longPressed.current = true; onPreview(card); }, 450);
  };
  const cancel = () => { clearTimeout(timer.current); };

  return (
    <div
      style={{ position: "relative", cursor: "pointer", userSelect: "none", WebkitTouchCallout: "none" }}
      onTouchStart={start} onTouchEnd={cancel} onTouchMove={cancel} onTouchCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (longPressed.current) { longPressed.current = false; return; } onAdd(card.url); }}
    >
      <img src={getProxyImageUrl(card.url)} alt={card.name} loading="lazy" draggable={false}
        style={{ width: "100%", borderRadius: "4px", display: "block", aspectRatio: "2/3", objectFit: "cover", opacity: count > 0 ? 0.6 : 1 }} />
      {card.cost !== "" && card.cost != null && (
        <div className="badge badge-cost" style={{ width: "20px", height: "20px", fontSize: "0.7rem", top: "2px", left: "2px" }}>{card.cost}</div>
      )}
      {card.faces && card.faces.length > 1 && (
        <div className="badge badge-faces" style={{ top: "2px", right: "2px", width: "18px", height: "18px", fontSize: "0.65rem" }}>{card.faces.length}</div>
      )}
      {count > 0 && (
        <div style={{ position: "absolute", bottom: "2px", right: "2px", background: "#ffd54f", color: "#000", borderRadius: "10px", padding: "0 6px", fontSize: "0.8rem", fontWeight: "bold", minWidth: "22px", textAlign: "center" }}>
          ×{count}
        </div>
      )}
    </div>
  );
}

export default function DeckCardPicker({ library, onAddToDeck, deckCounts = {}, onPreview }) {
  const [civil, setCivil] = useState("ALL");
  const [cost, setCost] = useState("ALL");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return library.filter((c) => {
      if (civil !== "ALL" && !(c.tags && c.tags.includes(civil))) return false;
      if (cost !== "ALL") {
        const n = Number(c.cost);
        if (c.cost === "" || c.cost == null || Number.isNaN(n)) return false;
        if (cost === "10+" ? n < 10 : n !== Number(cost)) return false;
      }
      if (q && !(c.name && c.name.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [library, civil, cost, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "6px 8px", background: "var(--surface-color)", flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        <input
          className="input-field" type="text" placeholder="カード名で検索..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", minHeight: "40px" }}
        />
        <div className="zone-scroll" style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          <button style={chipStyle(civil === "ALL")} onClick={() => setCivil("ALL")}>全文明</button>
          {CIVILS.map((c) => (
            <button key={c.name} style={chipStyle(civil === c.name, c.bg, c.fg)} onClick={() => setCivil(civil === c.name ? "ALL" : c.name)}>{c.name}</button>
          ))}
        </div>
        <div className="zone-scroll" style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          <button style={chipStyle(cost === "ALL")} onClick={() => setCost("ALL")}>全コスト</button>
          {COSTS.map((c) => (
            <button key={c} style={chipStyle(cost === c)} onClick={() => setCost(cost === c ? "ALL" : c)}>{c}</button>
          ))}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#888" }}>{filtered.length}件 ・ タップで追加 / 長押しで拡大</div>
      </div>

      <div className="zone-scroll" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))", gap: "6px",
        overflowY: "auto", padding: "8px", flex: 1, minHeight: 0, alignContent: "start",
      }}>
        {filtered.length === 0 && <p style={{ color: "#777", gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>該当なし</p>}
        {filtered.map((card) => (
          <Tile key={card.id} card={card} count={deckCounts[card.url] || 0} onAdd={onAddToDeck} onPreview={onPreview} />
        ))}
      </div>
    </div>
  );
}
