import { useState, useEffect } from "react";
import { collection, onSnapshot, setDoc, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getApiBaseUrl, resolveApiBase } from "../utils/apiConfig";

// 新図鑑のユーザー独自カード(公式カード詳細ページのURLから登録)。users/{uid}/customCards に保存する
export const useCustomCards = () => {
  const [customCards, setCustomCards] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "users", user.uid, "customCards"), (snap) => {
      setCustomCards(snap.docs.map((d) => ({ ...d.data(), id: d.id, custom: true })));
    });
  }, [user]);

  // 公式URLをサーバーに送り、取得したカード情報を保存する。成功時は登録したカードを返す
  const registerByUrl = async (url) => {
    if (!user) throw new Error("ログインが必要です");
    await resolveApiBase();
    const res = await fetch(`${getApiBaseUrl()}/api/register-official`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error((await res.text().catch(() => "")) || `取得に失敗しました (${res.status})`);
    const card = await res.json();
    if (!card.img) throw new Error("カード画像を取得できませんでした");
    await setDoc(doc(db, "users", user.uid, "customCards", card.id), { ...card, createdAt: new Date() });
    return card;
  };

  const deleteCustom = (id) => deleteDoc(doc(db, "users", user.uid, "customCards", id));

  return { customCards, registerByUrl, deleteCustom };
};
