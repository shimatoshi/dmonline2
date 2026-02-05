import { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import DeckList from "./pages/DeckList";
import DeckBuilder from "./pages/DeckBuilder";
import BBS from "./pages/BBS";
import GameTable from "./pages/GameTable";
import Profile from "./pages/Profile"; // 追加

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    navigate("/");
  };

  if (loading) return <div style={{ padding: "20px", color: "white" }}>Loading...</div>;
  if (!user) return <Login />;

  return (
    <div>
      <header style={{ background: "#1e1e1e", borderBottom: "1px solid #333", color: "#fff", padding: "10px 15px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 1000 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>Duema Online</h1>
        </div>
        
        <nav style={{ fontSize: "0.85rem", display: "flex", gap: "12px", alignItems: "center" }}>
          <Link to="/" style={{ color: "#e0e0e0", textDecoration: "none" }}>ロビー</Link>
          <Link to="/decks" style={{ color: "#e0e0e0", textDecoration: "none" }}>デッキ</Link>
          <Link to="/profile" style={{ color: "#e0e0e0", textDecoration: "none" }}>設定</Link>
          <button onClick={handleLogout} style={{ background: "#333", color: "#aaa", border: "1px solid #555", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>ログアウト</button>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/decks" element={<DeckList />} />
        <Route path="/deck/new" element={<DeckBuilder />} />
        <Route path="/deck/edit/:deckId" element={<DeckBuilder />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/bbs" element={<BBS />} />
        <Route path="/game/:roomId" element={<GameTable />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
