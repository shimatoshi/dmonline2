import { useState } from "react";
import CardRegister from "../components/CardRegister";
import CardLibrary from "../components/CardLibrary";
import { useLibrary } from "../hooks/useLibrary";

export default function CardLibraryPage() {
  const { library, allExistingTags, registerCard, deleteCard, updateCard, buildDedupePlan, applyDedupePlan } = useLibrary();
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  // 重複を除いた「取得リスト」をJSONで出力（削除はしない）。画像がGitHub Releasesに無いものは needsFetch: true
  const exportFetchList = () => {
    const norm = (n) => (n || "").normalize("NFKC").replace(/\s+/g, "");
    const map = new Map();
    library.forEach(c => {
      const key = norm(c.name);
      if (!key) return;
      const isGh = !!c.url?.includes("/releases/download/");
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { name: c.name, url: c.url, tags: [...(c.tags || [])], cost: c.cost || null, faces: c.faces || null, needsFetch: !isGh, count: 1 });
      } else {
        cur.count++;
        cur.tags = Array.from(new Set([...cur.tags, ...(c.tags || [])]));
        cur.cost = cur.cost || c.cost || null;
        if (!cur.faces && c.faces) cur.faces = c.faces;
        if (isGh && cur.needsFetch) { cur.url = c.url; cur.needsFetch = false; }
      }
    });
    const list = Array.from(map.values());
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }));
    a.download = `fetch-list-${Date.now()}.json`;
    a.click();
    setStatusMsg(`取得リスト出力: ${list.length}種類（要取得 ${list.filter(x => x.needsFetch).length}）`);
  };

  const previewDedupe = async () => {
    setBusy(true);
    try { setPlan(await buildDedupePlan()); }
    catch (e) { console.error(e); setStatusMsg("整理の準備に失敗しました: " + e.message); }
    setBusy(false);
  };
  const runDedupe = async () => {
    setBusy(true);
    try {
      await applyDedupePlan(plan);
      setStatusMsg(`${plan.deleteIds.length}件の重複を整理しました`);
      setPlan(null);
    } catch (e) { console.error(e); setStatusMsg("整理に失敗しました: " + e.message); }
    setBusy(false);
  };
  const [statusMsg, setStatusMsg] = useState("");

  const handleRegister = async (name, url, tags, cost, faces) => {
    await registerCard(name, url, tags, cost, faces);
    setStatusMsg("登録しました");
    setTimeout(() => setStatusMsg(""), 2000);
  };

  return (
    <div style={{ padding: "10px", maxWidth: "800px", margin: "0 auto", paddingBottom: "80px" }}>
      <h2 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", color: "#e0e0e0", marginBottom: "15px" }}>カード図鑑</h2>

      {statusMsg && <div style={{ color: "#42a5f5", fontSize: "0.85rem", marginBottom: "10px" }}>{statusMsg}</div>}

      <CardRegister onRegister={handleRegister} existingTags={allExistingTags} />

      <hr style={{ margin: "20px 0", borderTop: "1px solid #333" }} />

      <div style={{ marginBottom: "15px", padding: "10px", border: "1px solid #333", borderRadius: "6px", fontSize: "0.85rem" }}>
        <button className="btn" onClick={exportFetchList} style={{ marginRight: "8px" }}>📋 取得リスト出力（重複除去）</button>
        <button className="btn" onClick={previewDedupe} disabled={busy}>🧹 重複カードを整理（確認から）</button>
        {plan && (
          <div style={{ marginTop: "10px" }}>
            {plan.groups.length === 0 ? "重複はありません" : (
              <>
                <div>同名 {plan.groups.length} 種類から、重複 {plan.deleteIds.length} 件を削除します（図鑑のみ。デッキは変わりません）。</div>
                {plan.keptForDeck > 0 && <div style={{ color: "#aaa" }}>デッキが参照中の面付きカード {plan.keptForDeck} 件は残します。</div>}
                <div style={{ color: "#aaa", margin: "6px 0" }}>例: {plan.groups.slice(0, 5).map(g => `${g.keeper.name}(-${g.removed.length})`).join("、")}</div>
                <div style={{ color: "#aaa" }}>実行すると、バックアップJSONが自動でダウンロードされます。</div>
                <button className="btn btn-danger" onClick={runDedupe} disabled={busy} style={{ marginTop: "6px" }}>実行する</button>
              </>
            )}
            <button className="btn" onClick={() => setPlan(null)} style={{ marginLeft: "8px" }}>閉じる</button>
          </div>
        )}
      </div>

      <CardLibrary
        library={library}
        onDelete={deleteCard}
        onUpdate={updateCard}
        existingTags={allExistingTags}
      />
    </div>
  );
}
