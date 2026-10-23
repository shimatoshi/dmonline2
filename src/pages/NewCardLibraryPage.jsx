import { useState, useEffect, useMemo } from "react";
import { dedupeByName } from "../utils/dedupeCards";
import MigrationBanner from "../components/MigrationBanner";
import { getProxyImageUrl, resolveApiBase } from "../utils/apiConfig";
import { showToast } from "../utils/toast";
import { useCustomCards } from "../hooks/useCustomCards";

const CIVILS = ["火", "水", "自然", "光", "闇", "ゼロ"];
const PAGE = 60;
const norm = (s) => (s || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
// 公式サイトへは直接リクエストしない。画像は自前配信(GitHub Release経由 / 自サーバー /api/uploads)のみ
const imgOf = (c) => getProxyImageUrl(c.img);

export default function NewCardLibraryPage() {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [civil, setCivil] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [sel, setSel] = useState(null);
  const [, setReady] = useState(false);
  const { customCards, registerByUrl, cancelRegister, deleteCustom, fetchLog } = useCustomCards();
  const [regUrl, setRegUrl] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regMsg, setRegMsg] = useState("");

  const [dup, setDup] = useState(null); // 重複確認ダイアログ {card, existing}
  const [logRows, setLogRows] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const doRegister = async (force = false) => {
    if (!regUrl.trim() || regBusy) return;
    setRegBusy(true); setRegMsg("");
    try {
      const r = await registerByUrl(regUrl.trim(), force);
      if (r.status === "duplicate") setDup(r);
      else { setDup(null); setRegUrl(""); showToast(`登録が完了しました：${r.card.name}`, 2500); }
    } catch (e) { setDup(null); setRegMsg("登録に失敗しました: " + e.message); }
    setRegBusy(false);
  };
  const cancelDup = () => { cancelRegister(dup.card); setDup(null); };
  const openLog = async () => {
    setLogRows([]);
    try { setLogRows(await fetchLog()); } catch (e) { setLogRows(null); setRegMsg("ログの取得に失敗しました: " + e.message); }
  };

  useEffect(() => {
    // 自サーバー(/api/uploads)のURL基点を解決してから描画し直す
    resolveApiBase().then(() => setReady(true));
    fetch("/data/official_cards.json")
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => setCards(dedupeByName(d)))
      .catch((e) => setError("カードデータの読み込みに失敗しました: " + e.message));
  }, []);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const k = norm(q);
    return [...customCards, ...cards].filter((c) =>
      (!k || norm(c.name).includes(k) || norm(c.race).includes(k) || norm(c.text).includes(k)) &&
      (!civil || (c.civil || "").includes(civil))
    );
  }, [cards, customCards, q, civil]);

  return (
    <div style={{ color: "var(--text-primary)" }}>
      <MigrationBanner />
      <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <input value={regUrl} onChange={(e) => setRegUrl(e.target.value)} placeholder="公式カード詳細ページのURLで新規登録"
            style={{ flex: 1, minWidth: 0, padding: "8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color-light)", background: "var(--surface-color-dark)", color: "#fff" }} />
          <button onClick={() => doRegister(false)} disabled={regBusy || !regUrl.trim()} className="btn">{regBusy ? "取得中..." : "登録"}</button>
          <button onClick={openLog} className="btn btn-outline">ログ</button>
          <button onClick={() => setHelpOpen(true)} className="btn btn-outline" aria-label="使い方">？</button>
        </div>
        {regMsg && <div style={{ fontSize: "0.8rem", color: regMsg.startsWith("登録に失敗") ? "#ff8080" : "#42a5f5" }}>{regMsg}</div>}
        <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="カード名・種族・テキストで検索"
          style={{ padding: "8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color-light)", background: "var(--surface-color-dark)", color: "#fff" }} />
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["", ...CIVILS].map((c) => (
            <button key={c || "all"} onClick={() => { setCivil(c); setLimit(PAGE); }}
              style={{ padding: "4px 10px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-color-dark)", background: civil === c ? "var(--accent-color)" : "#2a2a2a", color: "#fff", fontSize: "0.8rem" }}>
              {c || "すべて"}
            </button>
          ))}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{cards ? `${filtered.length}件 / 全${cards.length}枚` : "読み込み中..."}</div>
        {error && <div style={{ color: "#ff8080" }}>{error}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px", padding: "8px" }}>
        {filtered.slice(0, limit).map((c) => (
          <div key={c.id} onClick={() => setSel(c)} style={{ cursor: "pointer", textAlign: "center" }}>
            <img src={imgOf(c)} alt={c.name} loading="lazy" referrerPolicy="no-referrer"
              style={{ width: "100%", aspectRatio: "63 / 88", objectFit: "cover", borderRadius: "var(--radius-sm)", background: "var(--surface-color-dark)" }} />
            <div style={{ fontSize: "0.75rem", marginTop: "2px", wordBreak: "break-all" }}>{c.name}</div>
          </div>
        ))}
      </div>
      {limit < filtered.length && (
        <div style={{ textAlign: "center", padding: "12px" }}>
          <button onClick={() => setLimit(limit + PAGE)} className="btn btn-outline">さらに表示</button>
        </div>
      )}

      {dup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2100, overflowY: "auto", padding: "16px" }}>
          <div style={{ background: "var(--surface-color)", borderRadius: "var(--radius-md)", padding: "12px", maxWidth: "420px", margin: "0 auto" }}>
            <h3 style={{ margin: "0 0 6px" }}>すでに登録されているカードです</h3>
            <div style={{ fontSize: "0.85rem", marginBottom: "8px" }}>
              「{dup.card.name}」{dup.card.pack ? `(${dup.card.pack})` : ""} と同じカードが図鑑にあります。別バージョンとして登録しますか？
            </div>
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px" }}>
              {dup.existing.map((c) => (
                <div key={c.id + c.img} style={{ flex: "0 0 110px", textAlign: "center", fontSize: "0.7rem" }}>
                  <img src={getProxyImageUrl(c.img)} alt={c.name} referrerPolicy="no-referrer"
                    style={{ width: "100%", aspectRatio: "63 / 88", objectFit: "cover", borderRadius: "var(--radius-sm)", background: "var(--surface-color-dark)" }} />
                  <div>{c.pack || ""}</div>
                  <div style={{ color: "var(--text-muted)" }}>{c.source === "custom" ? "登録済み" : "公式データ"}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={cancelDup} className="btn btn-outline" style={{ flex: 1 }}>登録をキャンセル</button>
              <button onClick={() => doRegister(true)} disabled={regBusy} className="btn" style={{ flex: 1 }}>{regBusy ? "登録中..." : "別バージョンとして登録"}</button>
            </div>
          </div>
        </div>
      )}

      {helpOpen && (
        <div onClick={() => setHelpOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2100, overflowY: "auto", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface-color)", borderRadius: "var(--radius-md)", padding: "14px", maxWidth: "420px", margin: "0 auto", fontSize: "0.85rem", lineHeight: 1.6 }}>
            <h3 style={{ margin: "0 0 8px" }}>新図鑑の使い方</h3>
            <b>カードを探す</b>
            <ul style={{ margin: "2px 0 10px", paddingLeft: "1.2em" }}>
              <li>検索欄にカード名・種族・テキストの一部を入れると絞り込めます。</li>
              <li>文明のボタンで、文明ごとに絞り込めます。</li>
              <li>カードをタップすると、画像と詳細(コスト・パワー・能力)を表示します。</li>
              <li>再録の多いカードは、1カードにまとめて表示しています。</li>
            </ul>
            <b>カードを新規登録する</b>
            <ol style={{ margin: "2px 0 10px", paddingLeft: "1.4em" }}>
              <li>公式サイト(dm.takaratomy.co.jp)でカード詳細ページを開き、URLをコピーします。</li>
              <li>図鑑上部の入力欄にURLを貼り付けて「登録」を押します。</li>
              <li>カード情報と画像を自動で取得し、「登録が完了しました」と表示されたら図鑑に追加されます。</li>
            </ol>
            <div style={{ color: "var(--text-secondary)", marginBottom: "10px" }}>
              例: dm.takaratomy.co.jp/card/detail/?id=dm01-008<br />
              ※「https://」が付いていなくても登録できます。
            </div>
            <b>すでにあるカードを登録したとき</b>
            <ul style={{ margin: "2px 0 10px", paddingLeft: "1.2em" }}>
              <li>同じカードが図鑑にある場合は確認が出ます。登録済みの画像を見比べて決められます。</li>
              <li>「別バージョンとして登録」で追加、「登録をキャンセル」で取りやめです。</li>
            </ul>
            <b>登録したカード</b>
            <ul style={{ margin: "2px 0 10px", paddingLeft: "1.2em" }}>
              <li>登録したカードは全員の図鑑に共有され、一覧の先頭に並びます。デッキ作成でも使えます。</li>
              <li>自分が登録したカードは、詳細画面の「登録を削除」で消せます(他の人のカードは消せません)。</li>
              <li>「ログ」ボタンで、登録・重複検出・キャンセル・削除の履歴を確認できます。</li>
            </ul>
            <button onClick={() => setHelpOpen(false)} className="btn btn-outline" style={{ width: "100%" }}>閉じる</button>
          </div>
        </div>
      )}

      {logRows && (
        <div onClick={() => setLogRows(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2100, overflowY: "auto", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface-color)", borderRadius: "var(--radius-md)", padding: "12px", maxWidth: "420px", margin: "0 auto" }}>
            <h3 style={{ margin: "0 0 8px" }}>登録ログ</h3>
            {logRows.length === 0 && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>ログはありません</div>}
            {logRows.map((r, i) => (
              <div key={i} style={{ fontSize: "0.8rem", padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ color: "var(--text-muted)" }}>{new Date(r.ts * 1000).toLocaleString("ja-JP")}</span>{" "}
                <b>{{ register: r.variant ? "別バージョン登録" : "登録", duplicate: "重複を検出", cancel: "キャンセル", delete: "削除" }[r.action] || r.action}</b>{" "}
                {r.name} <span style={{ color: "var(--text-muted)" }}>({r.id})</span>
              </div>
            ))}
            <button onClick={() => setLogRows(null)} className="btn btn-outline" style={{ marginTop: "12px", width: "100%" }}>閉じる</button>
          </div>
        </div>
      )}

      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 2000, overflowY: "auto", padding: "16px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface-color)", borderRadius: "var(--radius-md)", padding: "12px", maxWidth: "420px", margin: "0 auto" }}>
            <img src={imgOf(sel)} alt={sel.name} referrerPolicy="no-referrer" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
            <h3 style={{ margin: "8px 0 4px" }}>{sel.name}</h3>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {[sel.civil, sel.type, sel.cost && `コスト${sel.cost}`, sel.power && `パワー${sel.power}`, sel.race].filter(Boolean).join(" / ")}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 8px" }}>{sel.pack} {sel.rarelity}{sel.version ? ` / 別バージョン${sel.version}` : ""}</div>
            <div style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{sel.text}</div>
            {sel.custom && sel.mine && (
              <button onClick={() => { if (window.confirm("この登録カードを削除しますか？")) { deleteCustom(sel.id).then(() => showToast("削除しました")); setSel(null); } }}
                className="btn btn-danger" style={{ marginTop: "12px", width: "100%" }}>登録を削除</button>
            )}
            <button onClick={() => setSel(null)} className="btn btn-outline" style={{ marginTop: "12px", width: "100%" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}
