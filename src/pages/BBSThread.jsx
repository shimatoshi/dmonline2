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
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
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

    const q = query(collection(db, "bbs_threads", threadId, "responses"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResponses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [threadId, navigate]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) return;

    setIsSubmitting(true);
    let imageUrl = null;

    try {
      if (selectedFile) {
        // Base64変換
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
        const base64Data = await base64Promise;

        // JSON送信
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data }),
        });
        
        if (res.ok) {
          const data = await res.json();
          imageUrl = data.url;
        } else {
          console.error("Upload failed:", await res.text());
        }
      }

      await addDoc(collection(db, "bbs_threads", threadId, "responses"), {
        name: name || "名無しさん",
        content: content,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        userId: auth.currentUser?.uid || null
      });
      
      const threadRef = doc(db, "bbs_threads", threadId);
      await updateDoc(threadRef, {
        updatedAt: serverTimestamp(),
        responseCount: increment(1)
      });

      setContent("");
      setSelectedFile(null);
      const fileInput = document.getElementById('file-input');
      if (fileInput) fileInput.value = "";

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
    } catch (err) { console.error(err); }
  };

  if (!threadData) return <div style={{ padding: "20px", color: "white" }}>読み込み中...</div>;

  return (
    <div style={{ padding: "10px", background: "#121212", minHeight: "100vh", color: "#e0e0e0", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "15px" }}>
        <button onClick={() => navigate("/bbs")} style={{ background: "none", border: "none", color: "#007bff", cursor: "pointer", fontSize: "0.9rem" }}>
          ← 掲示板一覧へ戻る
        </button>
      </div>

      <h2 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", fontSize: "1.3rem", marginBottom: "15px", color: "#fff", wordBreak: "break-all" }}>
        {threadData.title}
      </h2>

      {/* スレッド親記事 */}
      <div style={{ background: "#1e1e1e", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #333" }}>
        <div style={{ marginBottom: "10px", fontWeight: "bold", color: "#4dabf7" }}>[1] {threadData.authorName}</div>
        
        {threadData.deckData && (
          <div style={{ background: "#2c2c2c", padding: "10px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "50px", aspectRatio: "2/3", background: "#000", borderRadius: "3px", overflow: "hidden" }}>
              {threadData.deckData.cards && threadData.deckData.cards[0] && (
                <img src={getProxyImageUrl(threadData.deckData.cards[0])} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff" }}>{threadData.deckData.name}</div>
              <div style={{ fontSize: "0.8rem", color: "#aaa" }}>{threadData.deckData.cards?.length || 0}枚</div>
            </div>
            <button onClick={() => handleImportDeck(threadData.deckData)} className="btn btn-success" style={{ fontSize: "0.8rem" }}>コピーして保存</button>
          </div>
        )}

        {threadData.imageUrl && (
          <div style={{ marginBottom: "10px" }}>
            <img src={threadData.imageUrl} style={{ maxWidth: "100%", borderRadius: "4px", border: "1px solid #444" }} onClick={() => window.open(threadData.imageUrl)} />
          </div>
        )}

        <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.5" }}>{threadData.comment}</div>
      </div>

      {/* レス一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {responses.map((res, index) => (
          <div key={res.id} style={{ background: "#1e1e1e", padding: "10px", borderRadius: "6px", border: "1px solid #333" }}>
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "4px" }}>
              <span style={{ color: "#aaa", marginRight: "8px" }}>{index + 2}</span>
              <span style={{ color: "#4dabf7", fontWeight: "bold" }}>{res.name}</span>
              <span style={{ marginLeft: "10px" }}>{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleString() : ""}</span>
            </div>
            {res.imageUrl && (
              <div style={{ marginBottom: "8px" }}>
                <img src={res.imageUrl} style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "4px", border: "1px solid #444", cursor: "pointer" }} onClick={() => window.open(res.imageUrl)} />
              </div>
            )}
            <div style={{ whiteSpace: "pre-wrap", fontSize: "0.95rem", lineHeight: "1.4", color: "#eee" }}>{res.content}</div>
          </div>
        ))}
      </div>

      {/* レス投稿フォーム */}
      <div style={{ background: "#1e1e1e", padding: "15px", borderRadius: "8px", border: "1px solid #333" }}>
        <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="名前"
            style={{ padding: "8px", background: "#2c2c2c", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
          />
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="メッセージを入力"
            style={{ width: "100%", height: "80px", padding: "8px", background: "#2c2c2c", border: "1px solid #444", color: "#fff", borderRadius: "4px", resize: "none" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              id="file-input"
              type="file" 
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{ fontSize: "0.8rem", color: "#aaa" }}
            />
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ padding: "12px", background: isSubmitting ? "#555" : "#007bff", color: "white", border: "none", borderRadius: "4px", fontWeight: "bold" }}
          >
            {isSubmitting ? "送信中..." : "書き込む"}
          </button>
        </form>
      </div>
      <div style={{ height: "50px" }}></div>
    </div>
  );
}
