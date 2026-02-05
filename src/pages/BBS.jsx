import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { getProxyImageUrl } from "../utils/apiConfig";

export default function BBS() {
  const [posts, setPosts] = useState([]);
  const [name, setName] = useState(auth.currentUser?.displayName || "名無しさん");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "bbs_posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(docs.reverse());
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "bbs_posts"), {
        name: name || "名無しさん",
        content: content,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || null
      });
      setContent("");
    } catch (err) {
      console.error("Error posting:", err);
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
      alert("自分のデッキリストに保存しました！");
    } catch (err) {
      console.error(err);
      alert("保存に失敗しました。");
    }
  };

  return (
    <div style={{ padding: "10px", background: "#121212", minHeight: "100vh", color: "#e0e0e0", fontFamily: "sans-serif" }}>
      <h2 style={{ 
        borderBottom: "1px solid #333", 
        paddingBottom: "10px", 
        fontSize: "1.2rem", 
        marginBottom: "15px",
        color: "#fff" 
      }}>
        掲示板
      </h2>

      {/* 投稿フォーム */}
      <div style={{ background: "#1e1e1e", padding: "15px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #333" }}>
        <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label style={{ fontSize: "0.85rem", color: "#aaa", display: "block", marginBottom: "4px" }}>名前</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              style={{ 
                width: "100%", 
                padding: "8px", 
                background: "#2c2c2c", 
                border: "1px solid #444", 
                color: "#fff", 
                borderRadius: "4px" 
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", color: "#aaa", display: "block", marginBottom: "4px" }}>メッセージ</label>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ここにメッセージを入力してください"
              style={{ 
                width: "100%", 
                height: "80px", 
                padding: "8px", 
                background: "#2c2c2c", 
                border: "1px solid #444", 
                color: "#fff", 
                borderRadius: "4px",
                resize: "none"
              }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              padding: "12px", 
              background: isSubmitting ? "#555" : "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              fontSize: "1rem", 
              cursor: isSubmitting ? "default" : "pointer",
              fontWeight: "bold"
            }}
          >
            {isSubmitting ? "送信中..." : "書き込む"}
          </button>
        </form>
      </div>

      {/* スレッド表示 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {posts.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>まだ投稿はありません。</p>
        ) : (
          posts.map((post, index) => (
            <div key={post.id} style={{ background: "#1e1e1e", padding: "12px", borderRadius: "8px", border: "1px solid #333" }}>
              <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <span style={{ color: "#aaa", marginRight: "8px" }}>{index + 1}</span>
                  <span style={{ color: "#4dabf7", fontWeight: "bold" }}>{post.name}</span>
                </div>
                <span>
                  {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : "..."}
                </span>
              </div>
              
              {/* デッキデータがある場合 */}
              {post.deckData && (
                <div style={{ 
                  background: "#2c2c2c", 
                  padding: "10px", 
                  borderRadius: "6px", 
                  marginBottom: "10px", 
                  borderLeft: "4px solid #007bff",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}>
                  <div style={{ width: "40px", aspectRatio: "2/3", background: "#000", borderRadius: "2px", overflow: "hidden" }}>
                    {post.deckData.cards && post.deckData.cards[0] && (
                      <img src={getProxyImageUrl(post.deckData.cards[0])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fff" }}>{post.deckData.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#aaa" }}>{post.deckData.cards?.length || 0}枚のデッキ</div>
                  </div>
                  <button 
                    onClick={() => handleImportDeck(post.deckData)}
                    style={{ 
                      padding: "6px 12px", 
                      background: "#28a745", 
                      color: "white", 
                      border: "none", 
                      borderRadius: "4px", 
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}
                  >
                    コピーして保存
                  </button>
                </div>
              )}

              <div style={{ 
                whiteSpace: "pre-wrap", 
                fontSize: "1rem", 
                lineHeight: "1.5", 
                color: "#eee",
                wordBreak: "break-word"
              }}>
                {post.content}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div style={{ height: "50px" }}></div>
    </div>
  );
}