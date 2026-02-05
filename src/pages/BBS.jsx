import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";

export default function BBS() {
  const [posts, setPosts] = useState([]);
  const [name, setName] = useState(auth.currentUser?.displayName || "名無しさん");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "bbs_posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 表示は古い順にしたいのでreverse（descで取得してreverse）
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

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "10px", background: "#efefef", minHeight: "100vh", color: "#000", fontFamily: "sans-serif" }}>
      <h2 style={{ background: "#0000ff", color: "#fff", padding: "5px 10px", fontSize: "1.2rem", margin: "0 0 10px 0" }}>
        なんJ風・DM掲示板
      </h2>

      {/* 投稿フォーム */}
      <div style={{ background: "#fff", padding: "10px", marginBottom: "15px", border: "1px solid #ccc" }}>
        <form onSubmit={handlePost}>
          <div style={{ marginBottom: "5px" }}>
            名前: <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              style={{ width: "150px" }}
            />
          </div>
          <div style={{ display: "flex", gap: "5px" }}>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ここに書き込むんやで"
              style={{ flex: 1, height: "60px", padding: "5px" }}
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ width: "80px", cursor: "pointer" }}
            >
              書込
            </button>
          </div>
        </form>
      </div>

      {/* スレッド表示 */}
      <div style={{ background: "#fff", padding: "10px", border: "1px solid #ccc" }}>
        {posts.length === 0 ? (
          <p style={{ color: "#888" }}>まだ書き込みがないようやな。</p>
        ) : (
          posts.map((post, index) => (
            <div key={post.id} style={{ marginBottom: "15px", borderBottom: "1px solid #eee", paddingBottom: "10px" }}>
              <div style={{ fontSize: "0.9rem", color: "#222", marginBottom: "3px" }}>
                <span style={{ color: "green", fontWeight: "bold" }}>{index + 1}</span> : 
                <span style={{ color: "blue", fontWeight: "bold", marginLeft: "5px" }}>{post.name}</span> : 
                <span style={{ marginLeft: "10px", color: "#666" }}>
                  {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : "..."}
                </span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginLeft: "20px", fontSize: "1rem", lineHeight: "1.4" }}>
                {post.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.8rem", color: "#666" }}>
        (C) 島田商会掲示板システム
      </div>
    </div>
  );
}