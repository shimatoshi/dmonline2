import { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { getGithubImageUrl } from "../utils/apiConfig";

export const useLibrary = () => {
  const [library, setLibrary] = useState([]);
  const user = auth.currentUser;

  const migrated = useRef(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "library"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cards = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setLibrary(cards);

      // 初回のみ: 外部URLをGitHub Release URLに自動マイグレーション
      if (!migrated.current) {
        migrated.current = true;
        console.log(`[migrate] checking ${cards.length} cards...`);
        cards.forEach(card => {
          if (!card.url || !card.name) { console.log(`[migrate] SKIP no url/name:`, card.id); return; }
          if (card.url.includes("github.com/") && card.url.includes("/releases/download/")) { return; }
          const ghUrl = getGithubImageUrl(card.name);
          if (ghUrl) {
            updateDoc(doc(db, "users", user.uid, "library", card.id), { url: ghUrl })
              .then(() => console.log(`[migrate] OK: "${card.name}" → GitHub`))
              .catch(e => console.error(`[migrate] FAIL: "${card.name}"`, e));
          } else {
            console.warn(`[migrate] NO MATCH: "${card.name}" (url: ${card.url.substring(0, 60)}...)`);
          }
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  const allExistingTags = useMemo(
    () => Array.from(new Set(library.flatMap(card => card.tags || []))).sort(),
    [library]
  );

  const registerCard = async (name, url, tags, cost, faces) => {
    if (!name || !url || !user) return;
    const cardData = { name, url, tags, cost: cost || null, createdAt: new Date() };
    if (faces && faces.length > 1) cardData.faces = faces;
    await addDoc(collection(db, "users", user.uid, "library"), cardData);
  };

  const deleteCard = async (id) => {
    if (!window.confirm("図鑑から削除しますか？")) return;
    await deleteDoc(doc(db, "users", user.uid, "library", id));
  };

  const updateCard = async (id, newData) => {
    await updateDoc(doc(db, "users", user.uid, "library", id), newData);
  };

  return { library, allExistingTags, registerCard, deleteCard, updateCard };
};
