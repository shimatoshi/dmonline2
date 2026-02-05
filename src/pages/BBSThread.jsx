import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { getProxyImageUrl } from "../utils/apiConfig";

export default function BBSThread() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [threadData, setThreadData] = useState(null);
  const [responses, setResponses] = useState([]);
  const [content, setContent] = useState("");
  const [name, setName] = useState(auth.currentUser?.displayName || "名無しさん");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // スレッド情報の取得
    const fetchThread = async () => {
      const docRef = doc(db, "bbs_threads", threadId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setThreadData({ id: docSnap.id, ...docSnap.data() });
      } else {
        alert("スレッドが見つかりません");
        navigate("/bbs");
      }
    };
    fetchThread();

    // レス一覧の取得
    const q = query(collection(db, "bbs_threads", threadId, "responses"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResponses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [threadId, navigate]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      // レスを追加
      await addDoc(collection(db, "bbs_threads", threadId, "responses"), {
        name: name || "名無しさん",
        content: content,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || null
      });
      
      // スレッドの更新日時とレス数を更新
      const threadRef = doc(db, "bbs_threads", threadId);
      await updateDoc(threadRef, {
        updatedAt: serverTimestamp(),
        responseCount: increment(1)
      });

      setContent("");
    } catch (err) {
      console.error("Error posting response:", err);
      alert("投稿に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportDeck = async (deckData) => {
    if (!auth.currentUser) return;
    if (!window.confirm(`デッキ「${deckData.name}」を自分のリストに保存しますか？`)) return;

    try {
      await addDoc(collection(db, "users", auth.currentUser.uid, "decks"), {
        name: `${deckData.name} (掲示板より)`,
        cards: deckData.cards,
        tags: ["掲示板"],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      alert("保存しました！");
    } catch (err) {
      console.error(err);
      alert("保存失敗");
    }
  };

  if (!threadData) return <div style={{ padding: "20px", color: "white" }}>読み込み中...</div>;

  return (
    <div style={{ padding: "10px", background: "#121212", minHeight: "100vh", color: "#e0e0e0", fontFamily: "sans-serif" }}>
      {/* ヘッダー戻るボタン */}
      <div style={{ marginBottom: "15px" }}>
        <button 
          onClick={() => navigate("/bbs")} 
          style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", fontSize: "0.9rem" }}
        >
          ← 掲示板一覧へ戻る
        </button>
      </div>

      <h2 style={{ 
        borderBottom: "1px solid #333", 
        paddingBottom: "10px", 
        fontSize: "1.3rem", 
        marginBottom: "15px",
        color: "#fff",
        wordBreak: "break-all"
      }}>
        {threadData.title}
      </h2>

      {/* スレッド親記事（デッキ情報があれば表示） */}
      {threadData.deckData && (
        <div style={{ 
          background: "#1e1e1e", 
          padding: "15px", 
          borderRadius: "8px", 
          marginBottom: "20px", 
          border: "1px solid #007bff"
        }}>
          <div style={{ marginBottom: "10px", fontWeight: "bold", color: "#4dabf7" }}>
            [1] {threadData.authorName} の投稿
          </div>
          
          <div style={{ 
            background: "#2c2c2c", 
            padding: "10px", 
            borderRadius: "6px", 
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div style={{ width: "50px", aspectRatio: "2/3", background: "#000", borderRadius: "3px", overflow: "hidden" }}>
              {threadData.deckData.cards && threadData.deckData.cards[0] && (
                <img src={getProxyImageUrl(threadData.deckData.cards[0])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff" }}>{threadData.deckData.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#aaa" }}>{threadData.deckData.cards?.length || 0}枚</div>
            </div>
            <button 
              onClick={() => handleImportDeck(threadData.deckData)}
              className="btn btn-success"
              style={{ fontSize: "0.8rem" }}
            >
              コピーして保存
            </button>
          </div>
          <div style={{ marginTop: "10px", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
            {threadData.comment}
          </div>
        </div>
      )}

      {/* レス一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {responses.map((res, index) => (
          <div key={res.id} style={{ background: "#1e1e1e", padding: "10px", borderRadius: "6px", border: "1px solid #333" }}>
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "4px" }}>
              <span style={{ color: "#aaa", marginRight: "8px" }}>{index + 2}</span> {/* 親記事が1なので2から */}
              <span style={{ color: "#4dabf7", fontWeight: "bold" }}>{res.name}</span>
              <span style={{ marginLeft: "10px" }}>{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleString() : ""}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem", lineHeight: "1.4", color: "#eee" }}>
              {res.content}
            </div>
          </div>
        ))}
      </div>

      {/* レス投稿フォーム */}
      <div style={{ background: "#1e1e1e", padding: "15px", borderRadius: "8px", border: "1px solid #333" }}>
        <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "0.85rem", color: "#aaa", display: "block", marginBottom: "4px" }}>名前</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              style={{ width: "100%", padding: "8px", background: "#2c2c2c", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", color: "#aaa", display: "block", marginBottom: "4px" }}>レスを投稿</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: "100%", height: "80px", padding: "8px", background: "#2c2c2c", border: "1px solid #444", color: "#fff", borderRadius: "4px", resize: "none" }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ padding: "10px", background: isSubmitting ? "#555" : "#007bff", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold" }}
          >
            書き込む
          </button>
        </form>
      </div>
      <div style={{ height: "50px" }}></div>
    </div>
  );
}
