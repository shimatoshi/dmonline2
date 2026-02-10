import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getProxyImageUrl } from "../utils/apiConfig";
import DeckImageGenerator from "../components/DeckImageGenerator";

export default function DeckList() {
  const [decks, setDecks] = useState([]);
  const [library, setLibrary] = useState([]); // 図鑑データも取得
  const [oldDeck, setOldDeck] = useState(null);
  
  // インポート/エクスポート用
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [importText, setImportText] = useState("");
  
  // 画像生成用
  const generatorRef = useRef(null);
  const [targetDeckForImage, setTargetDeckForImage] = useState({ name: "", cards: [] });
  const [showGenerator, setShowGenerator] = useState(false);

  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // 1. デッキ一覧
    const qDecks = query(collection(db, "users", user.uid, "decks"), orderBy("updatedAt", "desc"));
    const unsubDecks = onSnapshot(qDecks, (snapshot) => {
      setDecks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. 図鑑データ（エクスポート用）
    const qLib = query(collection(db, "users", user.uid, "library"));
    const unsubLib = onSnapshot(qLib, (snapshot) => {
      setLibrary(snapshot.docs.map(d => d.data()));
    });

    // 3. 旧データチェック
    const checkOldDeck = async () => {
      const oldDocRef = doc(db, "decks", user.uid);
      const oldDocSnap = await getDoc(oldDocRef);
      if (oldDocSnap.exists()) {
        setOldDeck(oldDocSnap.data());
      }
    };
    checkOldDeck();

    return () => {
      unsubDecks();
      unsubLib();
    };
  }, [user]);

  // --- 旧データ処理 ---
  const migrateOldDeck = async () => {
    if (!oldDeck) return;
    try {
      await addDoc(collection(db, "users", user.uid, "decks"), {
        name: "復元された作りかけデッキ",
        cards: oldDeck.cards || [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      await deleteDoc(doc(db, "decks", user.uid));
      setOldDeck(null);
      alert("復元しました！");
    } catch (e) { alert("エラー: " + e.message); }
  };

  const discardOldDeck = async () => {
    if (!window.confirm("本当に削除していいですか？")) return;
    try {
      await deleteDoc(doc(db, "decks", user.uid));
      setOldDeck(null);
    } catch (e) { console.error(e); }
  };

  // --- デッキ操作 ---
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("このデッキを削除しますか？")) {
      await deleteDoc(doc(db, "users", user.uid, "decks", id));
    }
  };

  const handleShare = (e, deck) => {
    e.stopPropagation();
    const shareData = JSON.stringify(deck.cards);
    navigator.clipboard.writeText(shareData);
    alert(`デッキ「${deck.name}」のデータをコピーしました！`);
  };

  const handlePostToBBS = async (e, deck) => {
    e.stopPropagation();
    if (!window.confirm(`デッキ「${deck.name}」を掲示板に投稿しますか？\n（新しいスレッドが作成されます）`)) return;

    try {
      // スレッドを作成
      const docRef = await addDoc(collection(db, "bbs_threads"), {
        title: `【デッキ】${deck.name}`,
        authorName: user.displayName || "名無しさん",
        authorId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        responseCount: 0,
        comment: "デッキを投稿しました。", // 初期コメント
        deckData: {
          name: deck.name,
          cards: deck.cards
        }
      });

      alert("掲示板に投稿しました！");
      navigate(`/bbs/thread/${docRef.id}`);
    } catch (err) {
      console.error(err);
      alert("投稿に失敗しました。");
    }
  };

  const handleGenerateImage = (e, deck) => {
    e.stopPropagation();
    if (!deck.cards || deck.cards.length === 0) {
      alert("カードがないデッキは画像化できません");
      return;
    }
    setTargetDeckForImage({ name: deck.name, cards: deck.cards });
    setShowGenerator(true);
  };

  // --- ★データ管理（インポート・エクスポート） ---
  
  // 図鑑データの書き出し
  const exportLibrary = () => {
    const exportData = library.map(({ name, url, tags, cost }) => ({ name, url, tags, cost }));
    const jsonString = JSON.stringify(exportData);
    navigator.clipboard.writeText(jsonString);
    alert(`図鑑データ(${exportData.length}枚)をコピーしました！`);
  };

  // 万能インポート処理
  const handleImport = async () => {
    if (!importText.trim()) return;
    
    try {
      const data = JSON.parse(importText);
      if (!Array.isArray(data)) throw new Error("形式が違います");

      // A. 配列の中身が文字列だけなら「デッキデータ」とみなす
      const isDeckData = data.every(item => typeof item === "string");

      if (isDeckData) {
        if(!window.confirm(`デッキデータ(${data.length}枚)として取り込みますか？`)) return;
        
        await addDoc(collection(db, "users", user.uid, "decks"), {
          name: "インポートされたデッキ",
          cards: data,
          tags: ["インポート"],
          createdAt: new Date(),
          updatedAt: new Date()
        });
        alert("新しいデッキとして保存しました！");
      } 
      // B. 中身がオブジェクトなら「図鑑データ」とみなす
      else {
        if(!window.confirm(`図鑑データ(${data.length}枚)として取り込みますか？`)) return;
        
        // 既存URLリスト（重複チェック用）
        const existingUrls = library.map(l => l.url);
        let count = 0;

        for (const card of data) {
          if (card.url && !existingUrls.includes(card.url)) {
            await addDoc(collection(db, "users", user.uid, "library"), {
              name: card.name || "未設定",
              url: card.url,
              tags: card.tags || [],
              cost: card.cost || null,
              createdAt: new Date()
            });
            count++;
          }
        }
        alert(`${count}枚のカードを図鑑に追加しました！`);
      }
      setImportText("");
    } catch (error) {
      console.error(error);
      alert("データの解析に失敗しました。正しいJSON形式か確認してください。");
    }
  };

  return (
    <div style={{ padding: "15px", maxWidth: "800px", margin: "0 auto", paddingBottom: "80px" }}>
      
      {/* 旧データ復元エリア */}
      {oldDeck && (
        <div style={{ background: "#252525", border: "1px solid #d32f2f", padding: "15px", borderRadius: "8px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0", color: "#ff6b6b", fontSize: "1rem" }}>⚠️ 以前の作りかけデータがあります</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <button onClick={migrateOldDeck} className="btn btn-primary" style={{ flex: 1 }}>リストに追加して復元</button>
            <button onClick={discardOldDeck} className="btn btn-outline" style={{ flex: 1, color: "#aaa", borderColor: "#555" }}>破棄</button>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#e0e0e0" }}>デッキ編成 / カード図鑑</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate("/deck/new")}
          style={{ padding: "8px 16px" }}
        >
          ＋ 新規作成
        </button>
      </div>

      {/* --- ★データ管理メニュー --- */}
      <div style={{ marginBottom: "20px" }}>
        <button 
          onClick={() => setShowDataMenu(!showDataMenu)} 
          style={{ background: "none", border: "none", color: "#007bff", textDecoration: "underline", cursor: "pointer", fontSize: "0.9rem" }}
        >
          {showDataMenu ? "▼ メニューを閉じる" : "▶ データの読み込み・書き出し"}
        </button>

        {showDataMenu && (
          <div style={{ background: "#1e1e1e", padding: "15px", borderRadius: "8px", marginTop: "10px", border: "1px solid #333" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#aaa" }}>
              デッキのコードや、図鑑のバックアップデータをここに貼り付けると自動で認識して取り込みます。
            </p>
            
            <textarea 
              className="input-field" 
              rows="3" 
              placeholder='ここにデータを貼り付け...' 
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              style={{ marginBottom: "10px", fontFamily: "monospace", fontSize: "0.8rem" }}
            />
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleImport} className="btn btn-success" style={{ flex: 2 }}>
                📥 データを取込 (自動判定)
              </button>
              <button onClick={exportLibrary} className="btn btn-outline" style={{ flex: 1, borderColor: "#007bff", color: "#007bff" }}>
                📤 図鑑をコピー
              </button>
            </div>
          </div>
        )}
      </div>

      {/* デッキリスト */}
      <div style={{ display: "grid", gap: "10px" }}>
        {decks.length === 0 && !oldDeck && <p style={{ color: "#777", textAlign: "center", padding: "20px" }}>デッキがまだありません</p>}
        
        {decks.map((deck) => (
          <div 
            key={deck.id} 
            onClick={() => navigate(`/deck/edit/${deck.id}`)}
            className="card-box"
            style={{ display: "flex", gap: "10px", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
          >
            <div style={{ width: "60px", aspectRatio: "2/3", background: "#000", borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
              {deck.thumbnail || (deck.cards && deck.cards[0]) ? (
                <img src={getProxyImageUrl(deck.thumbnail || deck.cards[0])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: "0.7rem" }}>No Img</div>
              )}
            </div>

            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {deck.name || "名称未設定デッキ"}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "#aaa", background: "#333", padding: "2px 6px", borderRadius: "4px" }}>
                  {deck.cards?.length || 0}枚
                </span>
                {deck.tags && deck.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: "0.75rem", color: "#81d4fa", background: "rgba(33, 150, 243, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <button onClick={(e) => handlePostToBBS(e, deck)} className="btn btn-success" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                掲示板に投稿
              </button>
              <button onClick={(e) => handleGenerateImage(e, deck)} className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                画像保存
              </button>
              <button onClick={(e) => handleShare(e, deck)} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                共有
              </button>
              <button onClick={(e) => handleDelete(e, deck.id)} className="btn" style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#ff6b6b", border: "1px solid #ff6b6b", background: "transparent" }}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeckImageGenerator 
        ref={generatorRef} 
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
        deckName={targetDeckForImage.name} 
        cards={targetDeckForImage.cards} 
      />
    </div>
  );
}