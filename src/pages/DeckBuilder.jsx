import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, updateDoc, setDoc, where } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";

import CardRegister from "../components/CardRegister";
import CardLibrary from "../components/CardLibrary";
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
  const [newDeckTag, setNewDeckTag] = useState("");

  const isEditMode = !!deckId;

  // 共有カードライブラリ
  const [library, setLibrary] = useState([]);
  // ユーザー個別タグ
  const [userCardTags, setUserCardTags] = useState({});
  const [statusMsg, setStatusMsg] = useState("");
  
  // UI制御
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isDeckMinimized, setIsDeckMinimized] = useState(false);
  const [showThumbSelector, setShowThumbSelector] = useState(false); // ★追加: サムネ選択モード
  
  // ★画像保存用ステート: trueの時だけCORS属性を付与して再レンダリングする
  const [isCapturing, setIsCapturing] = useState(false);
  
  const deckGridRef = useRef(null);

  // --- データ読み込み ---
  useEffect(() => {
    if (!user) return;

    // 共有カードマスターを購読
    const cardsQuery = query(collection(db, "cards"), orderBy("createdAt", "desc"));
    const unsubCards = onSnapshot(cardsQuery, (snapshot) => {
      setLibrary(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // ユーザー個別タグを購読
    const tagsQuery = query(collection(db, "users", user.uid, "cardTags"));
    const unsubTags = onSnapshot(tagsQuery, (snapshot) => {
      const tags = {};
      snapshot.docs.forEach(d => { tags[d.id] = d.data().tags || []; });
      setUserCardTags(tags);
    });

    const loadDeck = async () => {
      if (isEditMode) {
        const docRef = doc(db, "users", user.uid, "decks", deckId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDeckName(data.name || "");
          setDeckTags(data.tags || []);
          setDeckCards(data.cards || []);
          setDeckThumbnail(data.thumbnail || null); // ★読み込み
        } else {
          alert("デッキが見つかりません");
          navigate("/decks");
        }
      }
    };
    loadDeck();

    return () => { unsubCards(); unsubTags(); };
  }, [user, deckId, isEditMode, navigate]);

  // --- ロジック ---
  // 共有タグ + ユーザー個別タグを統合
  const allExistingTags = Array.from(new Set([
    ...library.flatMap(card => card.tags || []),
    ...Object.values(userCardTags).flat()
  ])).sort();

  const addToDeck = (url) => {
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
        name: deckName,
        tags: deckTags,
        cards: deckCards,
        thumbnail: deckThumbnail, // ★保存
        updatedAt: new Date()
      };

      if (isEditMode) {
        await updateDoc(doc(db, "users", user.uid, "decks", deckId), deckData);
        setStatusMsg("✅ 更新完了");
      } else {
        const docRef = await addDoc(collection(db, "users", user.uid, "decks"), {
          ...deckData,
          createdAt: new Date()
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

  // ★新しい画像保存ロジック
  const exportImage = async () => {
    if (!deckGridRef.current) return;
    if (deckCards.length === 0) { alert("カードがありません"); return; }
    
    // 1. 最小化を解除 & キャプチャモード(CORS有効化)ON
    setIsDeckMinimized(false);
    setIsCapturing(true);

    setStatusMsg("画像生成準備中...");

    // 2. Reactが再レンダリングして画像を読み込み直す時間を十分に確保する
    setTimeout(async () => {
      try {
        setStatusMsg("📸 撮影中...");
        
        const canvas = await html2canvas(deckGridRef.current, {
          useCORS: true, // これがないと外部画像は描画されない
          allowTaint: false, // Taint許可するとダウンロードできなくなるのでfalse
          backgroundColor: "#1e1e1e",
          scale: 2,
          logging: false
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
        // 3. 元に戻す
        setIsCapturing(false);
        setTimeout(() => setStatusMsg(""), 2000);
      }
    }, 1500); // 1.5秒待機（画像の再ロード待ち）
  };

  // --- カード登録 ---
  const addDeckTag = () => {
    const val = newDeckTag.trim();
    if (val && !deckTags.includes(val)) {
      setDeckTags([...deckTags, val]);
      setNewDeckTag("");
    }
  };

  const handleRegisterCard = async (name, url, tags, cost) => {
    if (!name || !url) return;
    // 共有カードマスターに登録
    await addDoc(collection(db, "cards"), {
      name, url, tags, cost: cost || null, createdAt: new Date()
    });
    setStatusMsg("共有図鑑に登録しました");
    setTimeout(() => setStatusMsg(""), 2000);
  };
  const handleDeleteCard = async (id) => {
    if(!window.confirm("共有図鑑から削除しますか？")) return;
    await deleteDoc(doc(db, "cards", id));
    // ユーザー個別タグも削除
    try { await deleteDoc(doc(db, "users", user.uid, "cardTags", id)); } catch(e) {}
  };
  const handleUpdateCard = async (id, newData) => {
    // 共有データ（name, url, cost）はcardsコレクションを更新
    const sharedData = {};
    if (newData.name !== undefined) sharedData.name = newData.name;
    if (newData.url !== undefined) sharedData.url = newData.url;
    if (newData.cost !== undefined) sharedData.cost = newData.cost;
    if (newData.tags !== undefined) sharedData.tags = newData.tags;
    if (Object.keys(sharedData).length > 0) {
      await updateDoc(doc(db, "cards", id), sharedData);
    }
  };
  const handleUpdateUserTags = async (cardId, tags) => {
    await setDoc(doc(db, "users", user.uid, "cardTags", cardId), { tags });
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

        {/* サムネ選択モダル */}
        {showThumbSelector && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.9)", zIndex: 2000, overflowY: "auto", padding: "20px" }}>
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
              <span key={tag} style={{ background: "#333", color: "#ddd", padding: "2px 8px", borderRadius: "10px", fontSize: "0.8rem", display: "flex", alignItems: "center" }}>
                {tag} <span onClick={() => setDeckTags(deckTags.filter(t => t !== tag))} style={{ marginLeft: "5px", color: "#ff6b6b", cursor: "pointer" }}>×</span>
              </span>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input 
                placeholder="+タグ" 
                value={newDeckTag} 
                onChange={e => setNewDeckTag(e.target.value)}
                style={{ background: "transparent", border: "none", borderBottom: "1px solid #555", color: "#fff", width: "60px", fontSize: "0.8rem" }}
              />
              <button onClick={addDeckTag} style={{ background: "none", border: "none", color: "#007bff", fontSize: "1rem" }}>+</button>
            </div>
          </div>
          <span style={{ color: "#42a5f5", fontSize:"0.8rem" }}>{statusMsg}</span>
        </div>
      </div>

      {/* デッキ表示エリア */}
      <div style={{ position: "sticky", top: "56px", zIndex: 50, background: "#121212", borderBottom: "2px solid #333", boxShadow: "0 4px 6px rgba(0,0,0,0.5)" }}>
        
        <div style={{ padding: "5px 10px", background: "#252525", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#aaa", fontSize: "0.8rem" }}>
            {deckName || "名称未設定"} ({deckCards.length}/40)
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={exportImage} disabled={isCapturing} className="btn btn-outline" style={{ fontSize: "0.7rem", padding: "2px 8px", borderColor: "#555", color: "#ddd" }}>
              {isCapturing ? "生成中..." : "📷 画像保存"}
            </button>
            <button 
              onClick={() => setIsDeckMinimized(!isDeckMinimized)} 
              className="btn btn-outline" 
              style={{ fontSize: "0.7rem", padding: "2px 8px", borderColor: "#555", color: "#ddd" }}
            >
              {isDeckMinimized ? "▼ 展開" : "▲ 最小化"}
            </button>
          </div>
        </div>

        {/* 画像化するコンテナ */}
        {(!isDeckMinimized || isCapturing) && (
          <div 
            ref={deckGridRef} 
            style={{ padding: "5px", background: "#1e1e1e", maxHeight: isCapturing ? "none" : "40vh", overflowY: "auto" }}
          >
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(5, 1fr)", 
              gap: "2px",
              minHeight: "80px"
            }}>
              {deckCards.map((url, index) => (
                <div key={index} style={{ position: "relative", cursor: "pointer" }} onClick={() => removeFromDeck(index)}>
                  {/* ★重要: isCapturing(画像保存中)の時だけ crossOrigin="anonymous" を付ける */}
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

      <div style={{ padding: "10px" }}>
        
        <CardRegister onRegister={handleRegisterCard} existingTags={allExistingTags} />

        <hr style={{ margin: "20px 0", borderTop: "1px solid #333" }} />

        <button 
          onClick={() => setIsLibraryOpen(!isLibraryOpen)} 
          className="btn"
          style={{ width: "100%", background: "#2c2c2c", border: "1px solid #444", color: "#e0e0e0", justifyContent: "space-between" }}
        >
          <span>カード図鑑から探す</span>
          <span>{isLibraryOpen ? "▲" : "▼"}</span>
        </button>

        {isLibraryOpen && (
          <div style={{ marginTop: "15px", animation: "fadeIn 0.3s" }}>
            <CardLibrary
              library={library}
              onAddToDeck={addToDeck}
              onDelete={handleDeleteCard}
              onUpdate={handleUpdateCard}
              onUpdateUserTags={handleUpdateUserTags}
              userCardTags={userCardTags}
              existingTags={allExistingTags}
            />
          </div>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
