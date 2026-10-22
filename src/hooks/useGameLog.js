import { useState, useEffect, useCallback } from "react";
import { addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// 対戦ログ(rooms/{roomId}/logs)。side は "host" | "guest"
export const useGameLog = (roomId, user, mySide) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!roomId || !user) return;
    const q = query(collection(db, "rooms", roomId, "logs"), orderBy("createdAt", "desc"), limit(60));
    return onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (e) => console.error("log subscribe failed:", e));
  }, [roomId, user]);

  // 書き込みは待たない(オフラインでも操作を止めない)
  const addLog = useCallback((text) => {
    if (!roomId || !user || !text) return;
    addDoc(collection(db, "rooms", roomId, "logs"), {
      text, side: mySide, senderId: user.uid, createdAt: serverTimestamp(),
    }).catch((e) => console.error("log write failed:", e));
  }, [roomId, user, mySide]);

  return { logs, addLog };
};
