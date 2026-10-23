import { useState, useEffect, useCallback } from "react";
import { auth } from "../firebase";
import { getApiBaseUrl, resolveApiBase } from "../utils/apiConfig";

// 新図鑑のユーザー独自カード。登録・重複判定・ログはすべてサーバー側で行い、ここは呼び出すだけ
const call = async (path, body) => {
  await resolveApiBase();
  const res = await fetch(`${getApiBaseUrl()}${path}`, body && {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `通信に失敗しました (${res.status})`);
  return res.json();
};

export const fetchCustomCards = (uid) => call(`/api/custom-cards?uid=${encodeURIComponent(uid)}`).then((d) => d.cards);

export const useCustomCards = () => {
  const [customCards, setCustomCards] = useState([]);
  const uid = auth.currentUser?.uid;

  const reload = useCallback(() => {
    if (!uid) return Promise.resolve();
    return fetchCustomCards(uid).then((c) => setCustomCards(c.map((x) => ({ ...x, custom: true })))).catch((e) => console.error(e));
  }, [uid]);
  useEffect(() => { reload(); }, [reload]);

  // 戻り値: {status:"registered", card} | {status:"duplicate", card, existing[]}。force=trueで別バージョンとして登録
  const registerByUrl = async (url, force = false) => {
    if (!uid) throw new Error("ログインが必要です");
    const r = await call("/api/register-official", { url, uid, force });
    if (r.status === "registered") await reload();
    return r;
  };
  const cancelRegister = (card) => call("/api/register-cancel", { uid, id: card.id, name: card.name }).catch(() => {});
  const deleteCustom = async (id) => { await call("/api/custom-cards/delete", { uid, id }); await reload(); };
  const fetchLog = () => call(`/api/register-log?uid=${encodeURIComponent(uid)}`).then((d) => d.log);

  return { customCards, registerByUrl, cancelRegister, deleteCustom, fetchLog };
};
