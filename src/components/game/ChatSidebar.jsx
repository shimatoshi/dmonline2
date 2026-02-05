import { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export const ChatSidebar = ({ roomId, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, "rooms", roomId, "messages"), {
        text: inputText,
        senderId: user.uid,
        // ★ここを変更: 表示名があれば使い、なければメールの前半
        senderName: user.displayName || user.email?.split("@")[0] || "Guest",
        createdAt: serverTimestamp()
      });
      setInputText("");
    } catch (error) {
      console.error("送信エラー:", error);
    }
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed", top: "50%", left: 0, transform: "translateY(-50%)",
            background: "#007bff", color: "white", border: "none",
            borderRadius: "0 8px 8px 0", padding: "15px 5px", zIndex: 4500,
            cursor: "pointer", boxShadow: "2px 0 5px rgba(0,0,0,0.5)"
          }}
        >
          💬
        </button>
      )}

      <div style={{
        position: "fixed", top: 0, left: 0, height: "100%", width: "280px",
        background: "#222", borderRight: "1px solid #444", zIndex: 5000,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease", display: "flex", flexDirection: "column",
        boxShadow: "5px 0 15px rgba(0,0,0,0.5)"
      }}>
        <div style={{ padding: "10px", background: "#333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: "bold", color: "#ddd" }}>チャット</span>
          <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#aaa", fontSize: "1.2rem" }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            return (
              <div key={msg.id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div style={{ fontSize: "0.7rem", color: "#aaa", marginBottom: "2px", textAlign: isMe ? "right" : "left" }}>
                  {msg.senderName}
                </div>
                <div style={{ 
                  padding: "8px 12px", fontSize: "0.9rem", wordBreak: "break-word",
                  background: isMe ? "#007bff" : "#444", color: "white",
                  borderRadius: isMe ? "12px 12px 0 12px" : "12px 12px 12px 0"
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} style={{ padding: "10px", borderTop: "1px solid #444", display: "flex", gap: "5px" }}>
          <input 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="メッセージ..."
            style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #555", background: "#111", color: "white" }}
          />
          <button type="submit" style={{ padding: "8px 12px", background: "#28a745", color: "white", border: "none", borderRadius: "4px" }}>➤</button>
        </form>
      </div>
      
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 4900, background: "rgba(0,0,0,0.3)" }}
        />
      )}
    </>
  );
};
