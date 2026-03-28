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

  // デッキデータ
  const [deckName, setDeckName] = useState("");
  const [deckTags, setDeckTags] = useState([]);
  const [deckCards, setDeckCards] = useState([]);
  const [deckThumbnail, setDeckThumbnail] = useState(null);
  const [hyperspaceCards, setHyperspaceCards] = useState([]);
  const [addToHyperspace, setAddToHyperspace] = useState(false);
  const [newDeckTag, setNewDeckTag] = useState("");

  const isEditMode = !!deckId;

  // ライブラリ（共通フック）
  const { library, allExistingTags, deleteCard, updateCard } = useLibrary();
  const [statusMsg, setStatusMsg] = useState("");

  // UI制御
  const [isDeckMinimized, setIsDeckMinimized] = useState(false);
  const [showThumbSelector, setShowThumbSelector] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const deckGridRef = useRef(null);

  // --- デッキ読み込み ---
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

  // --- ロジック ---
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

    setIsDeckMinimized(false);
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
        alert("画像の保存に失敗しました。\nWiki等の直リンク画像はセキュリティ制限により保存できません。");
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
    <div style={{ paddingBottom: "100px", maxWidth: "800px", margin: "0 auto" }}>

      {/* ヘッダー */}
      <div style={{ background: "#1e1e1e", padding: "15px", borderBottom: "1px solid #333" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            className="input-field"
            placeholder="デッキ名"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            style={{ flex: 1, fontSize: "1.1rem", fontWeight: "bold" }}
          />
          <button className="btn btn-outline" onClick={() => setShowThumbSelector(true)} style={{ fontSize: "0.8rem", color: "#ddd", borderColor: "#555" }}>
            サムネ設定
          </button>
          <button className="btn btn-primary" onClick={saveDeck} style={{ minWidth: "80px" }}>保存</button>
        </div>

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

        <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "5px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", flex: 1 }}>
            {deckTags.map(tag => (
              <span key={tag} className="pill" style={{ background: "#333", color: "#ddd" }}>
                {tag} <span onClick={() => setDeckTags(deckTags.filter(t => t !== tag))} style={{ marginLeft: "5px", color: "var(--danger-light)", cursor: "pointer" }}>×</span>
              </span>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                placeholder="+タグ"
                value={newDeckTag}
                onChange={e => setNewDeckTag(e.target.value)}
                style={{ background: "transparent", border: "none", borderBottom: "1px solid #555", color: "#fff", width: "60px", fontSize: "0.8rem" }}
              />
              <button onClick={addDeckTag} style={{ background: "none", border: "none", color: "var(--accent-color)", fontSize: "1rem" }}>+</button>
            </div>
          </div>
          <span style={{ color: "#42a5f5", fontSize: "0.8rem" }}>{statusMsg}</span>
        </div>
      </div>

      {/* デッキ表示エリア */}
      <div style={{ position: "sticky", top: "56px", zIndex: 50, background: "#121212", borderBottom: "2px solid #333", boxShadow: "0 4px 6px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "5px 10px", background: "#252525", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
            {deckName || "名称未設定"} ({deckCards.length}/40)
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={exportImage} disabled={isCapturing} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "2px 8px", borderColor: "#555", color: "#ddd" }}>
              {isCapturing ? "生成中..." : "📷 画像保存"}
            </button>
            <button onClick={() => setIsDeckMinimized(!isDeckMinimized)} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "2px 8px", borderColor: "#555", color: "#ddd" }}>
              {isDeckMinimized ? "▼ 展開" : "▲ 最小化"}
            </button>
          </div>
        </div>

        {(!isDeckMinimized || isCapturing) && (
          <div ref={deckGridRef} style={{ padding: "5px", background: "var(--surface-color)", maxHeight: isCapturing ? "none" : "40vh", overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2px", minHeight: "80px" }}>
              {deckCards.map((url, index) => (
                <div key={index} style={{ position: "relative", cursor: "pointer" }} onClick={() => removeFromDeck(index)}>
                  <img
                    src={getProxyImageUrl(url)}
                    crossOrigin={isCapturing ? "anonymous" : undefined}
                    style={{ width: "100%", height: "auto", borderRadius: "2px", display: "block" }}
                  />
                </div>
              ))}
              {[...Array(Math.max(0, 40 - deckCards.length))].map((_, i) => (
                <div key={`empty-${i}`} style={{ border: "1px dashed #444", borderRadius: "2px", aspectRatio: "2/3", background: "rgba(255,255,255,0.05)" }}></div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 超次元ゾーン */}
      {hyperspaceCards.length > 0 && (
        <div style={{ padding: "10px", background: "#0a1a2a", borderBottom: "1px solid var(--info-color)" }}>
          <span style={{ color: "var(--info-color)", fontSize: "0.85rem", fontWeight: "bold" }}>超次元ゾーン ({hyperspaceCards.length})</span>
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "5px", marginTop: "8px" }}>
            {hyperspaceCards.map((hsCard, i) => (
              <div key={i} style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}
                onClick={() => setHyperspaceCards(hyperspaceCards.filter((_, j) => j !== i))}>
                <img src={getProxyImageUrl(hsCard.url)} style={{ width: "60px", borderRadius: "3px", border: "1px solid var(--info-color)" }} />
                {hsCard.faces && hsCard.faces.length > 1 && (
                  <div className="badge badge-faces" style={{ top: "2px", right: "2px" }}>{hsCard.faces.length}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カード図鑑（常に表示） */}
      <div style={{ padding: "10px" }}>
        <div style={{ marginBottom: "10px" }}>
          <button
            onClick={() => setAddToHyperspace(!addToHyperspace)}
            className="btn"
            style={{ background: addToHyperspace ? "var(--info-color)" : "#333", color: addToHyperspace ? "#000" : "var(--text-secondary)", border: "1px solid var(--info-color)", fontSize: "0.8rem", padding: "6px 10px", fontWeight: addToHyperspace ? "bold" : "normal" }}
          >
            {addToHyperspace ? "超次元に追加中" : "超次元モード"}
          </button>
        </div>

        <CardLibrary
          library={library}
          onAddToDeck={addToDeck}
          onDelete={deleteCard}
          onUpdate={updateCard}
          existingTags={allExistingTags}
        />
      </div>
    </div>
  );
}
