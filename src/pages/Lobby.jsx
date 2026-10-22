import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, setDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy, runTransaction } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Announcements from "../components/Announcements";

export default function Lobby() {
  const [rooms, setRooms] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [selectedOpponentDeckId, setSelectedOpponentDeckId] = useState("");
  const [showSolo, setShowSolo] = useState(false);
  
  const navigate = useNavigate();
  const user = auth.currentUser;

  // ユーザー名の取得ヘルパー (設定なければメールの@より前を表示)
  const getUserName = () => {
    return user.displayName || user.email?.split("@")[0] || "Guest";
  };

  useEffect(() => {
    if (!user) return;

    // A. 募集中
    const qRooms = query(collection(db, "rooms"), where("status", "==", "waiting"));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      roomList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRooms(roomList);
    });

    // B. デッキ
    const qDecks = query(collection(db, "users", user.uid, "decks"), orderBy("updatedAt", "desc"));
    const unsubDecks = onSnapshot(qDecks, (snapshot) => {
      const deckList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyDecks(deckList);
      const deckIds = deckList.map(d => d.id);
      if (deckList.length > 0) {
        setSelectedDeckId(prev => (!prev || !deckIds.includes(prev)) ? deckList[0].id : prev);
        setSelectedOpponentDeckId(prev => (!prev || !deckIds.includes(prev)) ? deckList[0].id : prev);
      } else {
        setSelectedDeckId("");
        setSelectedOpponentDeckId("");
      }
    });

    // C. 進行中
    const qHostPlaying = query(collection(db, "rooms"), where("hostId", "==", user.uid), where("status", "==", "playing"));
    const qGuestPlaying = query(collection(db, "rooms"), where("guestId", "==", user.uid), where("status", "==", "playing"));

    let hostGames = [];
    let guestGames = [];

    const updateActiveGames = () => {
      const allActive = [...hostGames, ...guestGames].filter((game, index, self) => 
        index === self.findIndex((t) => t.id === game.id)
      );
      setActiveGames(allActive);
    };

    const unsubHost = onSnapshot(qHostPlaying, (snap) => {
      hostGames = snap.docs.map(d => ({ id: d.id, ...d.data(), role: "host" }));
      updateActiveGames();
    });

    const unsubGuest = onSnapshot(qGuestPlaying, (snap) => {
      guestGames = snap.docs.map(d => ({ id: d.id, ...d.data(), role: "guest" }));
      updateActiveGames();
    });

    return () => { unsubRooms(); unsubDecks(); unsubHost(); unsubGuest(); };
  }, [user]);

  const getSelectedDeckCards = () => {
    const deck = myDecks.find(d => d.id === selectedDeckId);
    return deck ? deck.cards : [];
  };

  const getSelectedDeckHyperspace = () => {
    const deck = myDecks.find(d => d.id === selectedDeckId);
    return deck?.hyperspaceCards || [];
  };

  const getSelectedOpponentDeckCards = () => {
    const deck = myDecks.find(d => d.id === selectedOpponentDeckId);
    return deck ? deck.cards : [];
  };

  const getSelectedOpponentDeckHyperspace = () => {
    const deck = myDecks.find(d => d.id === selectedOpponentDeckId);
    return deck?.hyperspaceCards || [];
  };

  const createRoom = async () => {
    if (!user) return;
    const deckCards = getSelectedDeckCards();
    if (deckCards.length === 0) { alert("デッキを選択してください"); return; }

    try {
      const docRef = await addDoc(collection(db, "rooms"), {
        hostId: user.uid,
        hostName: getUserName(), // ★名前を使用
        guestId: null,
        status: "waiting",
        createdAt: new Date(),
        hostData: { deck: deckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [], hyperspace: getSelectedDeckHyperspace() }
      });
      navigate(`/game/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("作成失敗: " + error.message);
    }
  };

  const createSoloRoom = async () => {
    if (!user) return;
    const deckCards = getSelectedDeckCards();
    const opponentDeckCards = getSelectedOpponentDeckCards();
    if (deckCards.length === 0) { alert("デッキを選択してください"); return; }
    if (opponentDeckCards.length === 0) { alert("相手用デッキを選択してください"); return; }

    try {
      // オフラインでも動くよう、awaitせずローカルID生成→書き込みは投げっぱなしで即遷移する
      // （オフライン時はFirestoreの書き込みPromiseがサーバーACK待ちで解決しないため）
      const docRef = doc(collection(db, "rooms"));
      setDoc(docRef, {
        hostId: user.uid,
        hostName: getUserName(),
        guestId: "solo",
        guestName: "1人回しモード",
        status: "playing",
        firstPlayerId: user.uid, // ソロは常に自分が先行。トランザクション不要にしてオフラインでも動くように
        createdAt: new Date(),
        hostData: { deck: deckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [], hyperspace: getSelectedDeckHyperspace() },
        guestData: { deck: opponentDeckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [], hyperspace: getSelectedOpponentDeckHyperspace() }
      }).catch((error) => console.error("solo room write failed:", error));
      navigate(`/game/${docRef.id}`);
    } catch (error) {
      console.error(error);
      alert("作成失敗: " + error.message);
    }
  };

  const joinRoom = async (roomId) => {
    if (!user) return;
    const deckCards = getSelectedDeckCards();
    if (deckCards.length === 0) { alert("デッキを選択してください"); return; }

    try {
      const roomRef = doc(db, "rooms", roomId);
      // 同時参加で先の参加者を上書きしないよう、空き状態をトランザクションで確認する
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomRef);
        if (!snap.exists()) throw new Error("部屋が見つかりません");
        const d = snap.data();
        if (d.status !== "waiting" || d.guestId) throw new Error("この部屋はすでに対戦が始まっています");
        if (d.hostId === user.uid) throw new Error("自分の部屋には参加できません");
        transaction.update(roomRef, {
          guestId: user.uid,
          guestName: getUserName(), // ★名前を使用
          status: "playing",
          guestData: { deck: deckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [], hyperspace: getSelectedDeckHyperspace() }
        });
      });
      navigate(`/game/${roomId}`);
    } catch (error) {
      alert("参加失敗: " + error.message);
    }
  };

  const deleteRoom = async (e, roomId) => {
    e.stopPropagation();
    if(!window.confirm("部屋を削除しますか？")) return;
    try { await deleteDoc(doc(db, "rooms", roomId)); } catch (e) { console.error(e); }
  };

  const enterGame = async (roomId) => {
    if (!user) return;
    const room = rooms.find(r => r.id === roomId);
    
    // デッキ更新処理
    const deckCards = getSelectedDeckCards();
    if (room && deckCards.length > 0) {
      try {
        const roomRef = doc(db, "rooms", roomId);
        if (room.hostId === user.uid) {
          await updateDoc(roomRef, { "hostData.deck": deckCards });
        } else if (room.guestId === user.uid) {
          await updateDoc(roomRef, { "guestData.deck": deckCards });
        }
      } catch (error) {
        console.error("デッキ更新失敗:", error);
      }
    }

    navigate(`/game/${roomId}`);
  };

  return (
    <div style={{ padding: "10px 12px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <Announcements />
      
      {activeGames.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <h3 style={{ color: "var(--danger-light)", borderLeft: "4px solid var(--danger-light)", paddingLeft: "10px" }}>🔴 進行中の対戦</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activeGames.map(game => (
              <div key={game.id} className="card-box" style={{ background: "#331515", border: "1px solid var(--danger-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold", color: "#fff" }}>
                    VS {game.role === "host" ? (game.guestName || "待機中...") : game.hostName}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#ffaaaa" }}>対戦中</div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => enterGame(game.id)} className="btn btn-success" style={{ padding: "8px 16px" }}>再開</button>
                  <button onClick={(e) => deleteRoom(e, game.id)} className="btn btn-outline" style={{ padding: "8px", fontSize: "0.8rem", borderColor: "var(--danger-light)", color: "var(--danger-light)" }}>削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-box" style={{ marginBottom: "14px", padding: "10px", background: "var(--surface-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", flexShrink: 0 }}>使用デッキ</span>
          <select
            className="input-field"
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            style={{ flex: 1, minHeight: "44px", background: "var(--surface-color-light)", color: "white" }}
          >
            {myDecks.length === 0 && <option value="">デッキがありません</option>}
            {myDecks.map(deck => (
              <option key={deck.id} value={deck.id}>{deck.name} ({deck.cards?.length || 0}枚)</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-primary"
            onClick={createRoom}
            disabled={myDecks.length === 0}
            style={{ flex: 2, minHeight: "48px", fontSize: "1rem", fontWeight: "bold", opacity: myDecks.length === 0 ? 0.5 : 1 }}
          >
            ＋ 対戦部屋を作る
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowSolo(!showSolo)}
            disabled={myDecks.length === 0}
            style={{ flex: 1, minHeight: "48px", borderColor: "var(--text-secondary)", color: "#ddd" }}
          >
            一人回し {showSolo ? "▲" : "▼"}
          </button>
        </div>
        {showSolo && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", flexShrink: 0 }}>相手デッキ</span>
            <select
              className="input-field"
              value={selectedOpponentDeckId}
              onChange={(e) => setSelectedOpponentDeckId(e.target.value)}
              style={{ flex: 1, minHeight: "44px", background: "var(--surface-color-light)", color: "white" }}
            >
              {myDecks.map(deck => (
                <option key={deck.id} value={deck.id}>{deck.name} ({deck.cards?.length || 0}枚)</option>
              ))}
            </select>
            <button className="btn btn-success" onClick={createSoloRoom} style={{ minHeight: "44px", padding: "0 14px" }}>開始</button>
          </div>
        )}
      </div>

      <h3 style={{ color: "var(--text-primary)" }}>対戦待ちの部屋</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {rooms.length === 0 && <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "20px" }}>現在募集中の部屋はありません</p>}

        {rooms.map((room) => {
          const isMyRoom = room.hostId === user.uid;
          return (
            <div key={room.id} className="card-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#252525", borderLeft: isMyRoom ? "4px solid var(--accent-color)" : "none" }}>
              <div>
                <div style={{ fontWeight: "bold", color: "#fff", marginBottom: "3px" }}>
                  {isMyRoom ? "あなたの部屋" : `Host: ${room.hostName}`}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>募集中...</div>
              </div>
              <div>
                {isMyRoom ? (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => enterGame(room.id)} className="btn btn-success" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>待機</button>
                    <button onClick={(e) => deleteRoom(e, room.id)} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.85rem", color: "var(--text-secondary)", borderColor: "var(--border-color-dark)" }}>取消</button>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => joinRoom(room.id)}>対戦する！</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
