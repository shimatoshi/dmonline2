import { useState, useEffect, useMemo } from "react";
import MigrationBanner from "../components/MigrationBanner";

const OFFICIAL = "https://dm.takaratomy.co.jp";
const CIVILS = ["火", "水", "自然", "光", "闇", "ゼロ"];
const PAGE = 60;
const norm = (s) => (s || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
const imgOf = (c) => c.img || (c.off ? OFFICIAL + c.off : "");

export default function NewCardLibraryPage() {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [civil, setCivil] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    fetch("/data/official_cards.json")
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setCards)
      .catch((e) => setError("カードデータの読み込みに失敗しました: " + e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const k = norm(q);
    return cards.filter((c) =>
      (!k || norm(c.name).includes(k) || norm(c.race).includes(k) || norm(c.text).includes(k)) &&
      (!civil || (c.civil || "").includes(civil))
    );
  }, [cards, q, civil]);

  useEffect(() => { setLimit(PAGE); }, [q, civil]);

  return (
    <div style={{ color: "#e0e0e0" }}>
      <MigrationBanner />
      <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="カード名・種族・テキストで検索"
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #444", background: "#222", color: "#fff" }} />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["", ...CIVILS].map((c) => (
            <button key={c || "all"} onClick={() => setCivil(c)}
              style={{ padding: "4px 10px", borderRadius: "12px", border: "1px solid #555", background: civil === c ? "#007bff" : "#2a2a2a", color: "#fff", fontSize: "0.8rem" }}>
              {c || "すべて"}
            </button>
          ))}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#aaa" }}>{cards ? `${filtered.length}件 / 全${cards.length}枚` : "読み込み中..."}</div>
        {error && <div style={{ color: "#ff8080" }}>{error}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px", padding: "8px" }}>
        {filtered.slice(0, limit).map((c) => (
          <div key={c.id} onClick={() => setSel(c)} style={{ cursor: "pointer", textAlign: "center" }}>
            <img src={imgOf(c)} alt={c.name} loading="lazy" referrerPolicy="no-referrer"
              style={{ width: "100%", aspectRatio: "63 / 88", objectFit: "cover", borderRadius: "4px", background: "#222" }} />
            <div style={{ fontSize: "0.65rem", marginTop: "2px", wordBreak: "break-all" }}>{c.name}</div>
          </div>
        ))}
      </div>
      {limit < filtered.length && (
        <div style={{ textAlign: "center", padding: "12px" }}>
          <button onClick={() => setLimit(limit + PAGE)} className="btn btn-outline">さらに表示</button>
        </div>
      )}

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, overflowY: "auto", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1e1e1e", borderRadius: "8px", padding: "12px", maxWidth: "420px", margin: "0 auto" }}>
            <img src={imgOf(sel)} alt={sel.name} referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: "6px" }} />
            <h3 style={{ margin: "8px 0 4px" }}>{sel.name}</h3>
            <div style={{ fontSize: "0.8rem", color: "#aaa" }}>
              {[sel.civil, sel.type, sel.cost && `コスト${sel.cost}`, sel.power && `パワー${sel.power}`, sel.race].filter(Boolean).join(" / ")}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#888", margin: "2px 0 8px" }}>{sel.pack} {sel.rarelity}</div>
            <div style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{sel.text}</div>
            <button onClick={() => setSel(null)} className="btn btn-outline" style={{ marginTop: "12px", width: "100%" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
