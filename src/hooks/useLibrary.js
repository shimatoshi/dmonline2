import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";

export const useLibrary = () => {
  const [library, setLibrary] = useState([]);
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "library"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLibrary(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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
