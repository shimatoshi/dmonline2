import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function BBS() {
  const [threads, setThreads] = useState([]);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // スレッド一覧を取得 (最終更新順)
    const q = query(collection(db, "bbs_threads"), orderBy("updatedAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setThreads(docs);
    });
    return () => unsubscribe();
  }, []);

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "bbs_threads"), {
        title: title,
        authorName: auth.currentUser?.displayName || "名無しさん",
        authorId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        responseCount: 0
      });
      setTitle("");
      navigate(`/bbs/thread/${docRef.id}`);
    } catch (err) {
      console.error("Error creating thread:", err);
      alert("スレッド作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
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
        掲示板 - スレッド一覧
      </h2>

      {/* スレッド作成フォーム */}
      <div style={{ background: "#1e1e1e", padding: "15px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #333" }}>
        <form onSubmit={handleCreateThread} style={{ display: "flex", gap: "10px" }}>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="新しいスレッドのタイトル"
            style={{ 
              flex: 1,
              padding: "10px", 
              background: "#2c2c2c", 
              border: "1px solid #444", 
              color: "#fff", 
              borderRadius: "4px" 
            }}
          />
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              padding: "0 20px", 
              background: isSubmitting ? "#555" : "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              fontSize: "0.9rem", 
              cursor: isSubmitting ? "default" : "pointer",
              fontWeight: "bold",
              whiteSpace: "nowrap"
            }}
          >
            スレ立て
          </button>
        </form>
      </div>

      {/* スレッドリスト */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {threads.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>スレッドがありません。</p>
        ) : (
          threads.map((thread) => (
            <Link 
              key={thread.id} 
              to={`/bbs/thread/${thread.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ 
                background: "#1e1e1e", 
                padding: "15px", 
                borderRadius: "8px", 
                border: "1px solid #333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "background 0.2s"
              }}>
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#4dabf7", marginBottom: "5px" }}>
                    {thread.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#888" }}>
                    作成: {thread.authorName} / 更新: {thread.updatedAt?.toDate ? thread.updatedAt.toDate().toLocaleString() : "..."}
                  </div>
                </div>
                <div style={{ 
                  background: "#333", 
                  padding: "5px 10px", 
                  borderRadius: "20px", 
                  fontSize: "0.8rem", 
                  color: "#aaa" 
                }}>
                  {thread.responseCount || 0}レス
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
      
      <div style={{ height: "50px" }}></div>
    </div>
  );
}
