import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Lobby() {
  const [rooms, setRooms] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [myDecks, setMyDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  
  const navigate = useNavigate();
  const user = auth.currentUser;

  // ユーザー名の取得ヘルパー (設定なければメールの@より前を表示)
  const getUserName = () => {
    return user.displayName || user.email.split("@")[0];
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
      if (deckList.length > 0 && !selectedDeckId) {
        setSelectedDeckId(deckList[0].id);
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
        hostData: { deck: deckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [] }
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
    if (deckCards.length === 0) { alert("デッキを選択してください"); return; }

    try {
      const docRef = await addDoc(collection(db, "rooms"), {
        hostId: user.uid,
        hostName: getUserName(),
        guestId: "solo",
        guestName: "1人回しモード",
        status: "playing",
        createdAt: new Date(),
        hostData: { deck: deckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [] },
        guestData: { deck: [], hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [] }
      });
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
      await updateDoc(roomRef, {
        guestId: user.uid,
        guestName: getUserName(), // ★名前を使用
        status: "playing",
        guestData: { deck: deckCards, hand: [], shields: [], manaZone: [], battleZone: [], graveyard: [], tempZone: [] }
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
    <div style={{ padding: "15px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <h2 style={{ borderBottom: "1px solid #333", paddingBottom: "10px", color: "#e0e0e0" }}>対戦ロビー</h2>
      
      {activeGames.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ color: "#ff6b6b", borderLeft: "4px solid #ff6b6b", paddingLeft: "10px" }}>🔴 進行中の対戦</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activeGames.map(game => (
              <div key={game.id} className="card-box" style={{ background: "#331515", border: "1px solid #ff6b6b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: "bold", color: "#fff" }}>
                    VS {game.role === "host" ? (game.guestName || "待機中...") : game.hostName}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#ffaaaa" }}>対戦中</div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => enterGame(game.id)} className="btn btn-success" style={{ padding: "8px 16px" }}>再開</button>
                  <button onClick={(e) => deleteRoom(e, game.id)} className="btn btn-outline" style={{ padding: "8px", fontSize: "0.8rem", borderColor: "#ff6b6b", color: "#ff6b6b" }}>削除</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-box" style={{ marginBottom: "30px", background: "#1e1e1e" }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#ccc" }}>対戦準備</h4>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontSize: "0.85rem", color: "#aaa", marginBottom: "5px" }}>使用デッキ:</label>
          <select 
            className="input-field"
            value={selectedDeckId} 
            onChange={(e) => setSelectedDeckId(e.target.value)}
            style={{ width: "100%", background: "#2c2c2c", color: "white" }}
          >
            {myDecks.length === 0 && <option value="">デッキがありません</option>}
            {myDecks.map(deck => (
              <option key={deck.id} value={deck.id}>{deck.name} ({deck.cards?.length || 0}枚)</option>
            ))}
          </select>
        </div>
        <button 
          className="btn btn-primary"
          onClick={createRoom}
          disabled={myDecks.length === 0}
          style={{ width: "100%", padding: "12px", fontSize: "1.1rem", fontWeight: "bold", opacity: myDecks.length === 0 ? 0.5 : 1 }}
        >
          ＋ 新しく対戦部屋を作る
        </button>
        <button 
          className="btn btn-outline"
          onClick={createSoloRoom}
          disabled={myDecks.length === 0}
          style={{ width: "100%", padding: "12px", fontSize: "1.1rem", fontWeight: "bold", marginTop: "10px", borderColor: "#aaa", color: "#ddd" }}
        >
          一人回し（練習）
        </button>
      </div>

      <h3 style={{ color: "#e0e0e0" }}>対戦待ちの部屋</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {rooms.length === 0 && <p style={{ color: "#777", textAlign: "center", padding: "20px" }}>現在募集中の部屋はありません</p>}

        {rooms.map((room) => {
          const isMyRoom = room.hostId === user.uid;
          return (
            <div key={room.id} className="card-box" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#252525", borderLeft: isMyRoom ? "4px solid #007bff" : "none" }}>
              <div>
                <div style={{ fontWeight: "bold", color: "#fff", marginBottom: "3px" }}>
                  {isMyRoom ? "あなたの部屋" : `Host: ${room.hostName}`}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#aaa" }}>募集中...</div>
              </div>
              <div>
                {isMyRoom ? (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={() => enterGame(room.id)} className="btn btn-success" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>待機</button>
                    <button onClick={(e) => deleteRoom(e, room.id)} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: "0.85rem", color: "#aaa", borderColor: "#555" }}>取消</button>
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
