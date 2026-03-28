import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc, runTransaction } from "firebase/firestore";
import { db } from "../firebase";

// ID生成用
const generateId = () => Math.random().toString(36).substr(2, 9);

export const useGameSync = (roomId, user) => {
  const [isHost, setIsHost] = useState(false);
  const [roomData, setRoomData] = useState(null);
  const [firstPlayerId, setFirstPlayerId] = useState(null);
  const [soloSide, setSoloSide] = useState("host"); // "host" or "guest"
  
  // 自分のデータ
  const [myHand, setMyHand] = useState([]);
  const [myBattleZone, setMyBattleZone] = useState([]);
  const [myManaZone, setMyManaZone] = useState([]);
  const [myShields, setMyShields] = useState([]);
  const [myGraveyard, setMyGraveyard] = useState([]);
  const [myHyperspace, setMyHyperspace] = useState([]);
  const [myDeck, setMyDeck] = useState([]);
  const [myTempZone, setMyTempZone] = useState([]);

  // 1. RoomData同期 & 初期設定
  useEffect(() => {
    if (!user || !roomId) return;
    const unsubscribe = onSnapshot(doc(db, "rooms", roomId), (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setRoomData(data);
      setFirstPlayerId(data.firstPlayerId);

      // 先行後攻決め (本来のHostのみが実行、トランザクションで重複防止)
      if (data.hostId === user.uid && data.guestId && !data.firstPlayerId) {
        const roomRef = doc(db, "rooms", roomId);
        runTransaction(db, async (transaction) => {
          const snap = await transaction.get(roomRef);
          if (!snap.exists() || snap.data().firstPlayerId) return;
          const d = snap.data();
          const firstId = d.guestId === "solo"
            ? d.hostId
            : (Math.random() < 0.5 ? d.hostId : d.guestId);
          transaction.update(roomRef, { firstPlayerId: firstId });
        });
      }
    });
    return () => unsubscribe();
  }, [roomId, user]);

  // 2. ローカルデータの抽出 (視点切り替え対応)
  useEffect(() => {
    if (!roomData || !user) return;

    const amIOwner = roomData.hostId === user.uid;
    const isSolo = roomData.guestId === "solo";

    // 視点の決定
    let effectiveIsHost = amIOwner;
    if (isSolo) {
      effectiveIsHost = (soloSide === "host");
    } else {
      // 通常対戦では自分がHostならHostデータ、GuestならGuestデータ
      effectiveIsHost = amIOwner;
    }
    
    setIsHost(effectiveIsHost);

    const myData = effectiveIsHost ? roomData.hostData : roomData.guestData;
    if (myData) {
      setMyDeck(myData.deck || []);
      setMyHand(myData.hand || []);
      setMyShields(myData.shields || []);
      setMyGraveyard(myData.graveyard || []);
      setMyHyperspace(normalizeHyperspace(myData.hyperspace)); 
      setMyTempZone(normalizeZone(myData.tempZone));
      setMyBattleZone(normalizeZone(myData.battleZone));
      setMyManaZone(normalizeZone(myData.manaZone));
    }
  }, [roomData, soloSide, user]);

  // 超次元ゾーン正規化 (文字列 or {url, faces} をそのまま保持)
  const normalizeHyperspace = (zoneData) => {
    if (!zoneData || !Array.isArray(zoneData)) return [];
    return zoneData.map(item => {
      if (!item) return null;
      if (typeof item === 'string') return item;
      // オブジェクト: faces付きカード
      return { url: item.url, faces: item.faces || null };
    }).filter(Boolean);
  };

  // データ正規化 (文字列配列をオブジェクト配列に変換など)
  const normalizeZone = (zoneData) => {
    if (!zoneData || !Array.isArray(zoneData)) return [];
    return zoneData.map(item => {
      if (!item) return { url: "/card_back.jpg", isTapped: false, isFaceDown: true, stack: [], id: generateId() };
      if (typeof item === "string") {
        return { url: item, isTapped: false, isFaceDown: false, stack: [], id: generateId() };
      }
      return { ...item, isFaceDown: item.isFaceDown || false, stack: item.stack || [] };
    });
  };

  // DBへの保存 (stateの更新はGameTable側で行われるが、ここでも最新stateをsaveするヘルパーを提供)
  const syncToDB = async (newData) => {
    // GameTable側でローカルstateを更新した後にこれを呼んでもらう、
    // またはここでローカルstateも更新するか。
    // 今回は「退避」が目的なので、GameTableのロジックを変えすぎないよう
    // 「引数で渡されたデータをDBに書く」機能だけ提供する。
    // ただし、GameTable内の performMoveWithData は state を直接 set している箇所が多い。
    // ここは少し工夫が必要。
    
    // 一旦、GameTableのロジックは「state更新」と「DB更新」が密結合しているので、
    // ここでは単純に「最新のstateを保持する」機能と「DB更新関数」を返す。
    
    const fieldName = isHost ? "hostData" : "guestData";
    
    // newData に含まれていないフィールドは現在のstateを使う
    // ※注意: Reactのstate更新は非同期なので、連続処理で古いstateを参照しないよう注意が必要だが、
    // 既存コードもその辺りは厳密ではなかったので一旦そのまま移植する。
    
    const dataToSave = {
      hand: newData.hand !== undefined ? newData.hand : myHand,
      battleZone: newData.battleZone !== undefined ? newData.battleZone : myBattleZone,
      manaZone: newData.manaZone !== undefined ? newData.manaZone : myManaZone,
      graveyard: newData.graveyard !== undefined ? newData.graveyard : myGraveyard,
      hyperspace: newData.hyperspace !== undefined ? newData.hyperspace : myHyperspace,
      shields: newData.shields !== undefined ? newData.shields : myShields,
      deck: newData.deck !== undefined ? newData.deck : myDeck,
      tempZone: newData.tempZone !== undefined ? newData.tempZone : myTempZone,
    };

    await updateDoc(doc(db, "rooms", roomId), { [fieldName]: dataToSave });
  };

  return {
    isHost, roomData, firstPlayerId,
    myHand, setMyHand,
    myBattleZone, setMyBattleZone,
    myManaZone, setMyManaZone,
    myShields, setMyShields,
    myGraveyard, setMyGraveyard,
    myHyperspace, setMyHyperspace, // ★追加
    myDeck, setMyDeck,
    myTempZone, setMyTempZone,
    syncToDB,
    generateId, // ID生成器もエクスポートしておく
    normalizeZone, // ★追加
    setSoloSide, // ★追加: 視点切り替え用
    isSolo: roomData?.guestId === "solo" // ★追加: 1人回しモード判定
  };
};