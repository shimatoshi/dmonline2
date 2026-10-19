import { useState, useEffect, useMemo, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc, getDocs, writeBatch } from "firebase/firestore";
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

  // --- 重複整理 ---
  // 名前（NFKC正規化・空白除去）が同じカードを1つにまとめる。
  // デッキはカードをURL文字列で保持しており図鑑のIDは参照しないため、図鑑の重複削除でデッキは変わらない。
  // 例外: デッキが参照しているURLを持つ「面(faces)付きカード」は超次元の面引きに使うので削除しない。
  const buildDedupePlan = async () => {
    if (!user) return { groups: [], deleteIds: [], keptForDeck: 0 };

    const deckSnap = await getDocs(collection(db, "users", user.uid, "decks"));
    const usedUrls = new Set();
    deckSnap.docs.forEach(d => {
      const data = d.data();
      (data.cards || []).forEach(u => usedUrls.add(typeof u === "string" ? u : u?.url));
      (data.hyperspaceCards || []).forEach(h => usedUrls.add(typeof h === "string" ? h : h?.url));
    });

    const norm = (n) => (n || "").normalize("NFKC").replace(/\s+/g, "");
    const byName = new Map();
    library.forEach(c => {
      const key = norm(c.name);
      if (!key) return;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(c);
    });

    const score = (c) =>
      (c.url?.includes("/releases/download/") ? 100 : 0) +
      (c.faces?.length > 1 ? 10 : 0) +
      (c.tags?.length || 0) + (c.cost ? 1 : 0);

    const groups = [];
    const deleteIds = [];
    let keptForDeck = 0;
    byName.forEach((cards) => {
      if (cards.length < 2) return;
      const sorted = [...cards].sort((a, b) => score(b) - score(a));
      const keeper = sorted[0];
      const dups = sorted.slice(1);
      const mergedTags = Array.from(new Set(cards.flatMap(c => c.tags || [])));
      const mergedCost = keeper.cost || cards.find(c => c.cost)?.cost || null;
      const removable = dups.filter(d => {
        if (d.faces?.length > 1 && usedUrls.has(d.url) && d.url !== keeper.url) { keptForDeck++; return false; }
        return true;
      });
      groups.push({ keeper, mergedTags, mergedCost, removed: removable });
      removable.forEach(d => deleteIds.push(d.id));
    });
    return { groups, deleteIds, keptForDeck };
  };

  const applyDedupePlan = async (plan) => {
    if (!user) return;
    // 念のためバックアップをJSONでダウンロード
    const backup = JSON.stringify(library.map(c => ({ ...c, createdAt: c.createdAt?.toDate?.().toISOString?.() || null })), null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([backup], { type: "application/json" }));
    a.download = `library-backup-${Date.now()}.json`;
    a.click();

    const ops = [];
    plan.groups.forEach(g => {
      ops.push({ type: "update", id: g.keeper.id, data: { tags: g.mergedTags, cost: g.mergedCost } });
      g.removed.forEach(d => ops.push({ type: "delete", id: d.id }));
    });
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach(op => {
        const ref = doc(db, "users", user.uid, "library", op.id);
        if (op.type === "update") batch.update(ref, op.data);
        else batch.delete(ref);
      });
      await batch.commit();
    }
  };

  return { library, allExistingTags, registerCard, deleteCard, updateCard, buildDedupePlan, applyDedupePlan };
};
