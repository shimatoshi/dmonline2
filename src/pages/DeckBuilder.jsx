import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, addDoc, collection, updateDoc } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";

import CardLibrary from "../components/CardLibrary";
import { useLibrary } from "../hooks/useLibrary";
import { getProxyImageUrl } from "../utils/apiConfig";

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
  const { library, allExistingTags, deleteCard, updateCard } = useLibrary();
  const [statusMsg, setStatusMsg] = useState("");
  const [showThumbSelector, setShowThumbSelector] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  // ピンチズームを許可
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    const original = viewport?.getAttribute('content');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
    return () => {
      if (viewport && original) viewport.setAttribute('content', original);
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
    if (deckCards.length >= 40) { alert("デッキは40枚までです"); return; }
    setDeckCards([...deckCards, url]);
  };

  const removeFromDeck = (indexToRemove) => {
    setDeckCards(deckCards.filter((_, i) => i !== indexToRemove));
  };

  const saveDeck = async () => {
    if (!user) return;
    if (!deckName.trim()) { alert("デッキ名を入力してください"); return; }
    setStatusMsg("保存中...");
    try {
      const deckData = {
        name: deckName, tags: deckTags, cards: deckCards,
        hyperspaceCards, thumbnail: deckThumbnail, updatedAt: new Date()
      };
      if (isEditMode) {
        await updateDoc(doc(db, "users", user.uid, "decks", deckId), deckData);
        setStatusMsg("✅ 更新完了");
      } else {
        const docRef = await addDoc(collection(db, "users", user.uid, "decks"), {
          ...deckData, createdAt: new Date()
        });
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
          useCORS: true, allowTaint: false, backgroundColor: "#1e1e1e", scale: 2, logging: false
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
        <button className="btn btn-outline" onClick={() => setShowMenu(!showMenu)} style={{ padding: "6px 8px", fontSize: "0.8rem", borderColor: "#555", color: "#ddd" }}>⋯</button>
        {statusMsg && <span style={{ color: "#42a5f5", fontSize: "0.75rem", alignSelf: "center" }}>{statusMsg}</span>}
      </div>

      {/* メニュー（タグ/サムネ/画像保存/超次元） */}
      {showMenu && (
        <div style={{ padding: "8px", background: "#252525", borderBottom: "1px solid var(--border-color)", flexShrink: 0, display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
          <button className="btn-mini" onClick={() => { setShowThumbSelector(true); setShowMenu(false); }}>サムネ設定</button>
          <button className="btn-mini" onClick={() => { exportImage(); setShowMenu(false); }} disabled={isCapturing}>
            {isCapturing ? "生成中..." : "📷 画像保存"}
          </button>
          <button
            onClick={() => setAddToHyperspace(!addToHyperspace)}
            className="btn-mini"
            style={{ background: addToHyperspace ? "var(--info-color)" : undefined, color: addToHyperspace ? "#000" : undefined, fontWeight: addToHyperspace ? "bold" : "normal" }}
          >
            {addToHyperspace ? "超次元追加中" : "超次元モード"}
          </button>
          <div className="separator-v" style={{ height: "20px" }}></div>
          {deckTags.map(tag => (
            <span key={tag} className="pill" style={{ background: "#333", color: "#ddd", fontSize: "0.7rem" }}>
              {tag} <span onClick={() => setDeckTags(deckTags.filter(t => t !== tag))} style={{ marginLeft: "3px", color: "var(--danger-light)", cursor: "pointer" }}>×</span>
            </span>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
            <input placeholder="+タグ" value={newDeckTag} onChange={e => setNewDeckTag(e.target.value)}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid #555", color: "#fff", width: "50px", fontSize: "0.7rem" }} />
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
                <img src={getProxyImageUrl(url)} style={{ width: "100%", borderRadius: "4px", border: deckThumbnail === url ? "3px solid yellow" : "none" }} />
              </div>
            ))}
          </div>
          <button className="btn" onClick={() => setShowThumbSelector(false)} style={{ display: "block", margin: "20px auto", background: "#333", color: "white" }}>閉じる</button>
        </div>
      )}

      {/* 中部: デッキカード一覧（固定高さ） */}
      <div ref={deckGridRef} style={{ padding: "3px", background: "#111", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 2px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{deckName || "名称未設定"} ({deckCards.length}/40)</span>
          {hyperspaceCards.length > 0 && (
            <span style={{ color: "var(--info-color)", fontSize: "0.7rem" }}>超次元 {hyperspaceCards.length}</span>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "1px" }}>
          {deckCards.map((url, index) => (
            <div key={index} style={{ cursor: "pointer" }} onClick={() => removeFromDeck(index)}>
              <img
                src={getProxyImageUrl(url)}
                crossOrigin={isCapturing ? "anonymous" : undefined}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block", borderRadius: "1px" }}
              />
            </div>
          ))}
          {[...Array(Math.max(0, 40 - deckCards.length))].map((_, i) => (
            <div key={`empty-${i}`} style={{ aspectRatio: "2/3", background: "rgba(255,255,255,0.02)", border: "1px dashed #222", borderRadius: "1px" }}></div>
          ))}
        </div>
      </div>

      {/* 超次元ゾーン */}
      {hyperspaceCards.length > 0 && (
        <div style={{ display: "flex", gap: "4px", padding: "4px 8px", background: "#0a1a2a", borderBottom: "1px solid var(--info-color)", flexShrink: 0, overflowX: "auto" }}>
          {hyperspaceCards.map((hsCard, i) => (
            <div key={i} style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
              onClick={() => setHyperspaceCards(hyperspaceCards.filter((_, j) => j !== i))}>
              <img src={getProxyImageUrl(hsCard.url)} style={{ height: "40px", borderRadius: "2px", border: "1px solid var(--info-color)" }} />
              {hsCard.faces && hsCard.faces.length > 1 && (
                <div className="badge badge-faces" style={{ top: "1px", right: "1px", width: "12px", height: "12px", fontSize: "0.5rem" }}>{hsCard.faces.length}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 下部: カード図鑑（残りの高さを全部使う） */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", borderTop: "2px solid var(--border-color)" }}>
        <CardLibrary
          library={library}
          onAddToDeck={addToDeck}
          onDelete={deleteCard}
          onUpdate={updateCard}
          existingTags={allExistingTags}
          layout="scroll"
        />
      </div>
    </div>
  );
}
