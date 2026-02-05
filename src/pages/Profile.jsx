import { useState, useEffect } from "react";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!name.trim()) return;
    setStatusMsg("更新中...");
    
    try {
      await updateProfile(user, { displayName: name });
      setStatusMsg("✅ プロフィールを更新しました");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch (error) {
      console.error(error);
      setStatusMsg("❌ エラーが発生しました");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", color: "#e0e0e0" }}>
      <h2 style={{ borderBottom: "1px solid #333", paddingBottom: "10px" }}>プロフィール設定</h2>
      
      <div className="card-box" style={{ marginTop: "20px", background: "#1e1e1e" }}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "#aaa" }}>
            メールアドレス (非公開)
          </label>
          <div style={{ padding: "10px", background: "#333", borderRadius: "4px", color: "#888" }}>
            {user?.email}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "#aaa" }}>
            ユーザー名 (表示名)
          </label>
          <input 
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前を入力してください"
            style={{ fontSize: "1.1rem" }}
          />
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleUpdate}
          style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
        >
          保存する
        </button>
        
        {statusMsg && (
          <p style={{ textAlign: "center", marginTop: "10px", color: statusMsg.includes("✅") ? "#28a745" : "#dc3545" }}>
            {statusMsg}
          </p>
        )}
      </div>

      <div style={{ marginTop: "30px", textAlign: "center" }}>
        <button onClick={() => navigate("/")} className="btn btn-outline">
          ロビーに戻る
        </button>
      </div>
    </div>
  );
}
