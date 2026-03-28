import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";

import Login from "./pages/Login";

// 遅延ロード: 初期表示に不要なページは必要になるまで読み込まない
const Lobby = lazy(() => import("./pages/Lobby"));
const DeckList = lazy(() => import("./pages/DeckList"));
const DeckBuilder = lazy(() => import("./pages/DeckBuilder"));
const BBS = lazy(() => import("./pages/BBS"));
const BBSThread = lazy(() => import("./pages/BBSThread"));
const CardLibraryPage = lazy(() => import("./pages/CardLibraryPage"));
const GameTable = lazy(() => import("./pages/GameTable"));
const Profile = lazy(() => import("./pages/Profile"));

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
          <Link to="/library" style={{ color: "#e0e0e0", textDecoration: "none" }}>図鑑</Link>
          <Link to="/bbs" style={{ color: "#e0e0e0", textDecoration: "none" }}>掲示板</Link>
          <Link to="/profile" style={{ color: "#e0e0e0", textDecoration: "none" }}>設定</Link>
          <button onClick={handleLogout} style={{ background: "#333", color: "#aaa", border: "1px solid #555", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>ログアウト</button>
        </nav>
      </header>

      <Suspense fallback={<div style={{ padding: "20px", color: "#aaa" }}>読み込み中...</div>}>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/decks" element={<DeckList />} />
          <Route path="/deck/new" element={<DeckBuilder />} />
          <Route path="/deck/edit/:deckId" element={<DeckBuilder />} />
          <Route path="/library" element={<CardLibraryPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bbs" element={<BBS />} />
          <Route path="/bbs/thread/:threadId" element={<BBSThread />} />
          <Route path="/game/:roomId" element={<GameTable />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
