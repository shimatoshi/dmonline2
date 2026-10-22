import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { updateProfile } from "firebase/auth";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [stats, setStats] = useState({ decks: null, games: null });

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
    }
  }, [user]);

  // 戦績の集計(オフライン等で取れない項目は「-」のまま)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const count = (q) => getCountFromServer(q).then((r) => r.data().count).catch(() => null);
    Promise.all([
      count(collection(db, "users", user.uid, "decks")),
      count(query(collection(db, "rooms"), where("hostId", "==", user.uid))),
      count(query(collection(db, "rooms"), where("guestId", "==", user.uid))),
    ]).then(([decks, asHost, asGuest]) => {
      if (!alive) return;
      setStats({ decks, games: asHost == null || asGuest == null ? null : asHost + asGuest });
    });
    return () => { alive = false; };
  }, [user]);

  const fmtDate = (s) => (s ? new Date(s).toLocaleDateString("ja-JP") : "-");

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
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", color: "var(--text-primary)" }}>
      <h2 style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>プロフィール</h2>

      <div className="card-box" style={{ marginTop: "16px", background: "var(--surface-color)", display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--accent-color)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold", flexShrink: 0 }}>
          {(user?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.displayName || user?.email?.split("@")[0] || "名無し"}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>登録日 {fmtDate(user?.metadata?.creationTime)} ・ 最終ログイン {fmtDate(user?.metadata?.lastSignInTime)}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        {[["デッキ", stats.decks], ["対戦部屋", stats.games]].map(([label, v]) => (
          <div key={label} className="card-box" style={{ flex: 1, textAlign: "center", background: "var(--surface-color)", padding: "10px" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-primary)" }}>{v == null ? "-" : v}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>
      
      <div className="card-box" style={{ marginTop: "20px", background: "var(--surface-color)" }}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            メールアドレス (非公開)
          </label>
          <div style={{ padding: "10px", background: "var(--border-color)", borderRadius: "4px", color: "var(--text-muted)" }}>
            {user?.email}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
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
          <p style={{ textAlign: "center", marginTop: "10px", color: statusMsg.includes("✅") ? "var(--success-color)" : "#dc3545" }}>
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
