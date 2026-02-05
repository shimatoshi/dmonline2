import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

export default function BBS() {
  const [threads, setThreads] = useState([]);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
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

      const docRef = await addDoc(collection(db, "bbs_threads"), {
        title: title,
        authorName: auth.currentUser?.displayName || "名無しさん",
        authorId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        responseCount: 0,
        imageUrl: imageUrl, 
        comment: "スレッドが作成されました。"
      });
      setTitle("");
      setSelectedFile(null);
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
      <h2 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", fontSize: "1.2rem", marginBottom: "15px", color: "#fff" }}>
        掲示板 - スレッド一覧
      </h2>

      {/* スレッド作成フォーム */}
      <div style={{ background: "#1e1e1e", padding: "15px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #333" }}>
        <form onSubmit={handleCreateThread} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="新しいスレッドのタイトル"
            style={{ padding: "10px", background: "#2c2c2c", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{ fontSize: "0.8rem", color: "#aaa" }}
            />
            {selectedFile && <span style={{ fontSize: "0.7rem", color: "#28a745" }}>選択中</span>}
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ padding: "12px", background: isSubmitting ? "#555" : "#007bff", color: "white", border: "none", borderRadius: "4px", fontSize: "0.9rem", cursor: isSubmitting ? "default" : "pointer", fontWeight: "bold" }}
          >
            {isSubmitting ? "送信中..." : "新しくスレッドを立てる"}
          </button>
        </form>
      </div>

      {/* スレッドリスト */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {threads.map((thread) => (
          <Link key={thread.id} to={`/bbs/thread/${thread.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ background: "#1e1e1e", padding: "15px", borderRadius: "8px", border: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {thread.imageUrl && (
                  <img src={thread.imageUrl} style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                )}
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#4dabf7", marginBottom: "5px" }}>{thread.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#888" }}>作成: {thread.authorName}</div>
                </div>
              </div>
              <div style={{ background: "#333", padding: "5px 10px", borderRadius: "20px", fontSize: "0.8rem", color: "#aaa" }}>
                {thread.responseCount || 0}レス
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div style={{ height: "50px" }}></div>
    </div>
  );
}
