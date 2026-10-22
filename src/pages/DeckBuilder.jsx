import { useState, useEffect, useRef, useMemo } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, getDocs, setDoc, collection, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

import DeckCardPicker from "../components/DeckCardPicker";
import { dedupeByName } from "../utils/dedupeCards";
import { getProxyImageUrl, resolveApiBase } from "../utils/apiConfig";

export default function DeckBuilder() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [deckName, setDeckName] = useState("");
  const [deckTags, setDeckTags] = useState([]);
  const [deckCards, setDeckCards] = useState([]);
  const [deckThumbnail, setDeckThumbnail] = useState(null);
  const [hyperspaceCards, setHyperspaceCards] = useState([]);
  const [addToHyperspace, setAddToHyperspace] = useState(false);
  const [newDeckTag, setNewDeckTag] = useState("");

  const isEditMode = !!deckId;
  // カード一覧はサーバー配信の公式カードデータ(新図鑑と共通)を使う
  const [library, setLibrary] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [showThumbSelector, setShowThumbSelector] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [preview, setPreview] = useState(null);

  const deckGridRef = useRef(null);

  useEffect(() => {
    if (!user || !isEditMode) return;
    const loadDeck = async () => {
      const docRef = doc(db, "users", user.uid, "decks", deckId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setDeckName(data.name || "");
        setDeckTags(data.tags || []);
        setDeckCards(data.cards || []);
        setHyperspaceCards(data.hyperspaceCards || []);
        setDeckThumbnail(data.thumbnail || null);
      } else {
        alert("デッキが見つかりません");
        navigate("/decks");
      }
    };
    loadDeck();
  }, [user, deckId, isEditMode, navigate]);

  useEffect(() => {
    let alive = true;
    resolveApiBase().catch(() => {}).then(() => fetch("/data/official_cards.json"))
      .then((r) => r.json())
      .then((cards) => {
        if (!alive) return;
        setLibrary((prev) => [...prev, ...dedupeByName(cards.filter((c) => c.img)).map((c) => ({
          id: c.id, url: c.img, name: c.name, cost: c.cost, text: c.text, type: c.type, civil: c.civil,
          tags: c.civil ? String(c.civil).split(/[/・]/).filter(Boolean) : [],
        }))]);
      })
      .catch((e) => console.error("official cards load failed:", e));
    return () => { alive = false; };
  }, []);

  // マイ図鑑に登録済みの「裏面つきカード(超次元・サイキック等)」は公式データに裏面が無いため、一覧に加える
  useEffect(() => {
    if (!user) return;
    let alive = true;
    getDocs(collection(db, "users", user.uid, "library"))
      .then((snap) => {
        if (!alive) return;
        const multiFace = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => c.url && Array.isArray(c.faces) && c.faces.length > 1);
        if (multiFace.length === 0) return;
        setLibrary((prev) => {
          const urls = new Set(prev.map((c) => c.url));
          return [...multiFace.filter((c) => !urls.has(c.url)), ...prev];
        });
      })
      .catch((e) => console.error("my library load failed:", e));
    return () => { alive = false; };
  }, [user]);

  // ピンチズームを許可
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const original = viewport?.getAttribute('content');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    return () => {
      if (viewport && original != null) viewport.setAttribute('content', original);
    };
  }, []);

  const addToDeck = (url) => {
    if (addToHyperspace) {
      if (hyperspaceCards.length >= 8) { alert("超次元は8枚までです"); return; }
      const libCard = library.find(c => c.url === url);
      const faces = libCard?.faces || [url];
      setHyperspaceCards([...hyperspaceCards, { url, faces }]);
      return;
    }
    if (deckCards.length >= 40) { setStatusMsg("デッキは40枚までです"); setTimeout(() => setStatusMsg(""), 1500); return; }
    const name = costOf(url)?.name;
    const sameName = name ? deckCards.filter((u) => costOf(u)?.name === name).length : 0;
    // 「何枚でも入れられる」カードがあるため、ブロックせず警告だけ出す
    if (sameName >= 4) { setStatusMsg(`⚠ 「${name}」が5枚目です`); setTimeout(() => setStatusMsg(""), 1800); }
    setDeckCards([...deckCards, url]);
  };

  // 同じカードを1枚減らす(最後に追加した1枚)
  const removeOneFromDeck = (url) => {
    const idx = deckCards.lastIndexOf(url);
    if (idx < 0) return;
    setDeckCards(deckCards.filter((_, i) => i !== idx));
  };

  const costOf = useMemo(() => {
    const m = {};
    library.forEach((c) => { if (!(c.url in m)) m[c.url] = c; });
    return (url) => m[url];
  }, [library]);

  const deckCounts = useMemo(() => {
    const m = {};
    deckCards.forEach((u) => { m[u] = (m[u] || 0) + 1; });
    return m;
  }, [deckCards]);

  // コスト順(不明は末尾)にまとめた表示用グループ
  const groups = useMemo(() => {
    const list = Object.keys(deckCounts).map((url) => {
      const c = costOf(url);
      const n = c && c.cost !== "" && c.cost != null ? Number(c.cost) : NaN;
      return { url, count: deckCounts[url], cost: Number.isNaN(n) ? 99 : n, name: c?.name || "" };
    });
    return list.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name, "ja"));
  }, [deckCounts, costOf]);

  // コスト分布(0〜7+)
  const curve = useMemo(() => {
    const arr = Array(8).fill(0);
    groups.forEach((g) => { if (g.cost !== 99) arr[Math.min(g.cost, 7)] += g.count; });
    return arr;
  }, [groups]);
  const curveMax = Math.max(1, ...curve);

  const saveDeck = async () => {
    if (!user) return;
    if (!deckName.trim()) { alert("デッキ名を入力してください"); return; }
    setStatusMsg("保存中...");
    try {
      const deckData = {
        name: deckName, tags: deckTags, cards: deckCards,
        hyperspaceCards, thumbnail: deckThumbnail, updatedAt: new Date()
      };
      // awaitしない: オフライン時はFirestoreの書き込みPromiseが解決しないため、
      // ローカルキャッシュへの書き込み（即時反映）を信頼して完了扱いにする
      if (isEditMode) {
        updateDoc(doc(db, "users", user.uid, "decks", deckId), deckData)
          .catch((e) => console.error("deck update failed:", e));
        setStatusMsg("✅ 更新完了");
      } else {
        const docRef = doc(collection(db, "users", user.uid, "decks"));
        setDoc(docRef, { ...deckData, createdAt: new Date() })
          .catch((e) => console.error("deck create failed:", e));
        setStatusMsg("✅ 作成完了");
        navigate(`/deck/edit/${docRef.id}`, { replace: true });
      }
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (e) {
      console.error(e);
      setStatusMsg("❌ エラー");
    }
  };

  const exportImage = async () => {
    if (!deckGridRef.current) return;
    if (deckCards.length === 0) { alert("カードがありません"); return; }
    setIsCapturing(true);
    setStatusMsg("画像生成準備中...");
    setTimeout(async () => {
      try {
        setStatusMsg("📸 撮影中...");
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(deckGridRef.current, {
          useCORS: true, allowTaint: false, backgroundColor: "var(--surface-color)", scale: 2, logging: false
        });
        const link = document.createElement("a");
        link.download = `${deckName || "deck"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setStatusMsg("✅ 画像保存完了");
      } catch (error) {
        console.error(error);
        alert("画像の保存に失敗しました。");
      } finally {
        setIsCapturing(false);
        setTimeout(() => setStatusMsg(""), 2000);
      }
    }, 1500);
  };

  const addDeckTag = () => {
    const val = newDeckTag.trim();
    if (val && !deckTags.includes(val)) {
      setDeckTags([...deckTags, val]);
      setNewDeckTag("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 45px)", overflow: "hidden" }}>

      {/* 上部: デッキ名 + 保存 */}
      <div style={{ display: "flex", gap: "6px", padding: "6px 8px", background: "var(--surface-color)", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
        <input
          className="input-field"
          placeholder="デッキ名"
          value={deckName}
          onChange={e => setDeckName(e.target.value)}
          style={{ flex: 1, padding: "6px 8px", fontSize: "0.9rem", fontWeight: "bold" }}
        />
        <button className="btn btn-primary" onClick={saveDeck} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>保存</button>
        <button className="btn btn-outline" onClick={() => setShowMenu(!showMenu)} style={{ padding: "6px 8px", fontSize: "0.8rem", borderColor: "var(--border-color-dark)", color: "#ddd" }}>⋯</button>
        {statusMsg && <span style={{ color: "#42a5f5", fontSize: "0.75rem", alignSelf: "center" }}>{statusMsg}</span>}
      </div>

      {/* メニュー（タグ/サムネ/画像保存/超次元） */}
      {showMenu && (
        <div style={{ padding: "8px", background: "#252525", borderBottom: "1px solid var(--border-color)", flexShrink: 0, display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <button className="btn-mini" onClick={() => { setShowThumbSelector(true); setShowMenu(false); }}>サムネ設定</button>
          <button className="btn-mini" onClick={() => { exportImage(); setShowMenu(false); }} disabled={isCapturing}>
            {isCapturing ? "生成中..." : "📷 画像保存"}
          </button>
          <div className="separator-v" style={{ height: "20px" }}></div>
          {deckTags.map(tag => (
            <span key={tag} className="pill" style={{ background: "var(--border-color)", color: "#ddd", fontSize: "0.7rem" }}>
              {tag} <span onClick={() => setDeckTags(deckTags.filter(t => t !== tag))} style={{ marginLeft: "3px", color: "var(--danger-light)", cursor: "pointer" }}>×</span>
            </span>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <input placeholder="+タグ" value={newDeckTag} onChange={e => setNewDeckTag(e.target.value)}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid var(--border-color-dark)", color: "#fff", width: "50px", fontSize: "0.7rem" }} />
            <button onClick={addDeckTag} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "0.9rem" }}>+</button>
          </div>
        </div>
      )}

      {/* サムネ選択モーダル */}
      {showThumbSelector && (
        <div className="overlay overlay-dark" style={{ zIndex: 2000, overflowY: "auto", padding: "20px" }}>
          <h3 style={{ color: "white", textAlign: "center" }}>サムネイルを選択</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
            {deckCards.map((url, i) => (
              <div key={i} onClick={() => { setDeckThumbnail(url); setShowThumbSelector(false); }} style={{ cursor: "pointer" }}>
                <img src={getProxyImageUrl(url)} style={{ width: "100%", borderRadius: "var(--radius-sm)", border: deckThumbnail === url ? "3px solid yellow" : "none" }} />
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => setShowThumbSelector(false)} style={{ display: "block", margin: "20px auto", background: "var(--border-color)", color: "white" }}>閉じる</button>
        </div>
      )}

      {/* 中部: デッキ(コスト順にまとめて表示) */}
      <div ref={deckGridRef} style={{ padding: "3px", background: "#111", flexShrink: 0, maxHeight: isCapturing ? "none" : "36vh", overflowY: isCapturing ? "visible" : "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px", gap: "8px" }}>
          <span style={{ color: deckCards.length === 40 ? "var(--success-color)" : "var(--text-muted)", fontSize: "0.8rem", fontWeight: "bold" }}>
            {deckName || "名称未設定"} ({deckCards.length}/40)
          </span>
          {!isCapturing && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "22px" }} title="コスト分布">
              {curve.map((n, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <div style={{ width: "10px", height: `${Math.round((n / curveMax) * 14)}px`, background: n ? "var(--accent-color)" : "#2a2a2a", borderRadius: "var(--radius-sm)" }}></div>
                  <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", lineHeight: 1 }}>{i === 7 ? "7+" : i}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {isCapturing ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "1px" }}>
            {deckCards.map((url, index) => (
              <img key={index} src={getProxyImageUrl(url)} crossOrigin="anonymous" loading="eager"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--radius-sm)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "3px" }}>
            {groups.length === 0 && <p style={{ gridColumn: "1 / -1", color: "#666", fontSize: "0.8rem", textAlign: "center", margin: "10px 0" }}>下の一覧からカードをタップして追加</p>}
            {groups.map((g) => (
              <div key={g.url} style={{ position: "relative", cursor: "pointer" }} onClick={() => removeOneFromDeck(g.url)}>
                <img src={getProxyImageUrl(g.url)} loading="lazy" style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--radius-sm)" }} />
                {g.count > 1 && (
                  <div style={{ position: "absolute", bottom: "1px", right: "1px", background: "#ffd54f", color: "#000", borderRadius: "var(--radius-md)", padding: "0 5px", fontSize: "0.75rem", fontWeight: "bold" }}>×{g.count}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 超次元の追加モード切替(常時表示) */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", background: "#181818", flexShrink: 0 }}>
        <button
          onClick={() => setAddToHyperspace(!addToHyperspace)}
          style={{ minHeight: "36px", padding: "4px 12px", borderRadius: "var(--radius-pill)", border: addToHyperspace ? "2px solid #fff" : "1px solid var(--border-color-dark)", background: addToHyperspace ? "var(--info-color)" : "var(--surface-color-light)", color: addToHyperspace ? "#000" : "#ccc", fontWeight: addToHyperspace ? "bold" : "normal", fontSize: "0.85rem" }}
        >
          {addToHyperspace ? "超次元に追加中" : "超次元に追加"} ({hyperspaceCards.length}/8)
        </button>
        <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>デッキの枚数をタップで1枚減らす</span>
      </div>

      {/* 超次元ゾーン */}
      {hyperspaceCards.length > 0 && (
        <div style={{ display: "flex", gap: "4px", padding: "4px 8px", background: "#0a1a2a", borderBottom: "1px solid var(--info-color)", flexShrink: 0, overflowX: "auto" }}>
          {hyperspaceCards.map((hsCard, i) => (
            <div key={i} style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
              onClick={() => setHyperspaceCards(hyperspaceCards.filter((_, j) => j !== i))}>
              <img src={getProxyImageUrl(hsCard.url)} style={{ height: "40px", borderRadius: "var(--radius-sm)", border: "1px solid var(--info-color)" }} />
              {hsCard.faces && hsCard.faces.length > 1 && (
                <div className="badge badge-faces" style={{ top: "1px", right: "1px", width: "12px", height: "12px", fontSize: "0.5rem" }}>{hsCard.faces.length}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 下部: カード図鑑（残りの高さを全部使う） */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", borderTop: "2px solid var(--border-color)" }}>
        <DeckCardPicker
          library={library}
          onAddToDeck={addToDeck}
          deckCounts={deckCounts}
          onPreview={setPreview}
        />
      </div>

      {preview && (
        <div className="overlay overlay-dark" onClick={() => setPreview(null)} style={{ zIndex: 4000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", gap: "10px", overflowY: "auto" }}>
          <img src={getProxyImageUrl(preview.url)} style={{ maxWidth: "70%", maxHeight: "50vh", borderRadius: "var(--radius-md)" }} />
          <div style={{ color: "#fff", fontWeight: "bold" }}>{preview.name} {preview.cost ? `(コスト${preview.cost})` : ""}</div>
          {preview.text && <div style={{ color: "#ccc", fontSize: "0.85rem", whiteSpace: "pre-wrap", maxWidth: "92%", lineHeight: 1.5 }}>{preview.text}</div>}
          <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); addToDeck(preview.url); }} style={{ minHeight: "44px", padding: "8px 24px" }}>デッキに追加</button>
        </div>
      )}
    </div>
  );
}
