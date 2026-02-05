import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

export default function Login() {
  const [isLoginMode, setIsLoginMode] = useState(true); // ログインか登録かのモード切替
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 送信ボタンを押したときの処理
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // エラーリセット

    try {
      if (isLoginMode) {
        // ログイン処理
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // 新規登録処理
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // 成功するとApp.jsx側で自動的に画面が切り替わります
    } catch (err) {
      // エラー処理（パスワードが短い、既に登録済みなど）
      console.error(err);
      setError("エラーが発生しました: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>{isLoginMode ? "ログイン" : "新規ユーザー登録"}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: "10px" }}
        />
        <input
          type="password"
          placeholder="パスワード (6文字以上)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: "10px" }}
        />
        <button type="submit" style={{ padding: "10px", background: "#007bff", color: "white", border: "none", borderRadius: "5px" }}>
          {isLoginMode ? "ログインする" : "登録する"}
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}

      <hr style={{ margin: "20px 0" }} />
      
      <button 
        onClick={() => setIsLoginMode(!isLoginMode)}
        style={{ background: "none", border: "none", color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
      >
        {isLoginMode ? "アカウントをお持ちでない方はこちら (新規登録)" : "すでにアカウントをお持ちの方はこちら (ログイン)"}
      </button>
    </div>
  );
}
