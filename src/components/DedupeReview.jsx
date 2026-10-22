import { useEffect, useMemo, useState } from "react";
import { getProxyImageUrl } from "../utils/apiConfig";

// 比較用に名前を正規化（NFKC・小文字・空白/記号除去・括弧内除去）
const norm = (n) => (n || "").normalize("NFKC").toLowerCase()
  .replace(/[（(\[【「『<＜].*?[）)\]】」』>＞]/g, "")
  .replace(/[\s\-_ー〜~・･、。,.!！?？:：;；'"“”‘’/\\|]/g, "");

const lev = (a, b) => {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
};

// 似ているか（同URL / 片方がもう片方を含む(2文字以上) / 編集距離で類似度0.75以上）
const similar = (a, b) => {
  if (a.url && a.url === b.url) return "同じ画像URL";
  const x = a._n, y = b._n;
  if (!x || !y) return null;
  if (x === y) return "名前一致（括弧・記号違い）";
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  if (s.length >= 2 && l.includes(s)) return "略称/バージョン違いの可能性";
  if (Math.abs(x.length - y.length) / Math.max(x.length, y.length) > 0.25) return null; // 長さが違いすぎるものは高速スキップ
  const sim = 1 - lev(x, y) / Math.max(x.length, y.length);
  if (sim >= 0.75) return "表記ゆれの可能性";
  return null;
};

const score = (c) =>
  (c.url?.includes("/releases/download/") ? 100 : 0) + (c.faces?.length > 1 ? 10 : 0) + (c.tags?.length || 0) + (c.cost ? 1 : 0);

const buildGroups = (library) => {
  const items = library.map(c => ({ ...c, _n: norm(c.name) }));
  const parent = items.map((_, i) => i);
  const reasons = new Map();
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const r = similar(items[i], items[j]);
      if (r) {
        parent[find(i)] = find(j);
        reasons.set(find(i), (reasons.get(find(i)) || new Set()).add(r));
      }
    }
  }
  const groups = new Map();
  items.forEach((c, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(c);
  });
  const allReasons = new Set();
  return Array.from(groups.values()).filter(g => g.length > 1).map(g => {
    const rs = new Set();
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const r = similar(g[i], g[j]); if (r) rs.add(r); }
    allReasons.add(rs);
    return { cards: [...g].sort((a, b) => score(b) - score(a)), reasons: Array.from(rs) };
  }).sort((a, b) => b.cards.length - a.cards.length);
};

export default function DedupeReview({ library, getUsedUrls, applyReview, onClose, onDone }) {
  const [used, setUsed] = useState(new Set());
  const groups = useMemo(() => buildGroups(library), [library]);
  // decisions[id] = true: 残す / false: 消す。初期値は各グループの最良のみ残す
  const [keep, setKeep] = useState(() => {
    const k = {};
    buildGroups(library).forEach(g => g.cards.forEach((c, i) => { k[c.id] = i === 0; }));
    return k;
  });
  const [skipped, setSkipped] = useState({}); // groupIndex -> true で全部残す(別物扱い)
  const [busy, setBusy] = useState(false);

  // 初回のみ取得（getUsedUrlsは毎レンダーで再生成されるため依存に入れない）
  useEffect(() => { getUsedUrls().then(setUsed).catch(() => {}); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deletes = [];
  const updates = [];
  groups.forEach((g, gi) => {
    if (skipped[gi]) return;
    const kept = g.cards.filter(c => keep[c.id]);
    const removed = g.cards.filter(c => !keep[c.id]);
    if (removed.length === 0 || kept.length === 0) return;
    removed.forEach(c => deletes.push(c.id));
    const tags = Array.from(new Set(g.cards.flatMap(c => c.tags || [])));
    const cost = kept[0].cost || g.cards.find(c => c.cost)?.cost || null;
    updates.push({ id: kept[0].id, data: { tags, cost } });
  });
  const noKeeper = groups.filter((g, gi) => !skipped[gi] && g.cards.every(c => !keep[c.id])).length;

  const run = async () => {
    if (noKeeper > 0) { alert(`全部消す設定のグループが${noKeeper}件あります。1枚は残してください。`); return; }
    if (!window.confirm(`${deletes.length}件を図鑑から削除します。（バックアップJSONが自動保存されます）よろしいですか？`)) return;
    setBusy(true);
    try { await applyReview(deletes, updates); onDone(`${deletes.length}件を整理しました`); }
    catch (e) { alert("失敗しました: " + e.message); }
    setBusy(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 5000, overflowY: "auto", padding: "10px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h3 style={{ margin: 0 }}>類似カードの整理（{groups.length}グループ）</h3>
          <button className="btn" onClick={onClose}>閉じる</button>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "10px" }}>
          各カードの「残す/消す」を切り替えてください。初期は各グループで最も情報が揃った1枚だけ残す設定です。別物なら「別物(全部残す)」を押してください。削除は図鑑のみで、デッキは変わりません（デッキ使用中のカードには🎴が付きます）。
        </div>
        {groups.length === 0 && <div>類似するカードは見つかりませんでした。</div>}
        {groups.map((g, gi) => (
          <div key={gi} style={{ border: "1px solid var(--border-color-light)", borderRadius: "var(--radius-md)", padding: "8px", marginBottom: "10px", opacity: skipped[gi] ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--warning-color)", marginBottom: "6px" }}>
              <span>{g.reasons.join(" / ") || "類似"}</span>
              <button className="btn-mini" onClick={() => setSkipped({ ...skipped, [gi]: !skipped[gi] })}>
                {skipped[gi] ? "対象に戻す" : "別物(全部残す)"}
              </button>
            </div>
            {g.cards.map(c => (
              <div key={c.id} style={{ display: "flex", gap: "8px", alignItems: "center", padding: "4px 0", borderTop: "1px solid var(--surface-color-dark)" }}>
                <img src={getProxyImageUrl(c.url)} loading="lazy" style={{ width: "44px", aspectRatio: "2/3", objectFit: "cover", borderRadius: "var(--radius-sm)", background: "var(--surface-color-dark)" }} />
                <div style={{ flex: 1, minWidth: 0, fontSize: "0.8rem" }}>
                  <div style={{ fontWeight: "bold", wordBreak: "break-all" }}>
                    {used.has(c.url) && <span title="デッキで使用中">🎴 </span>}{c.name}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                    コスト {c.cost ?? "-"} ／ タグ {c.tags?.length || 0}{c.faces?.length > 1 ? " ／ 面あり" : ""}{c.url?.includes("/releases/download/") ? " ／ ✅画像あり" : " ／ 画像なし(要取得)"}
                  </div>
                </div>
                <button
                  className="btn"
                  disabled={!!skipped[gi]}
                  onClick={() => setKeep({ ...keep, [c.id]: !keep[c.id] })}
                  style={{ background: keep[c.id] || skipped[gi] ? "var(--success-color)" : "#dc3545", color: "white", minWidth: "60px" }}
                >
                  {keep[c.id] || skipped[gi] ? "残す" : "消す"}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#111", borderTop: "1px solid var(--border-color-light)", padding: "10px", textAlign: "center", zIndex: 5001 }}>
        <span style={{ marginRight: "10px", fontSize: "0.85rem" }}>削除予定 {deletes.length}件</span>
        <button className="btn btn-danger" onClick={run} disabled={busy || deletes.length === 0}>反映する</button>
      </div>
    </div>
  );
}
