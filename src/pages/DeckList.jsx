import { useState, useEffect, useRef } from "react";
import { auth, db } from "../firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc, addDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { getProxyImageUrl } from "../utils/apiConfig";
import DeckImageGenerator from "../components/DeckImageGenerator";

export default function DeckList() {
  const [decks, setDecks] = useState([]);
  const [library, setLibrary] = useState([]); // 図鑑データも取得
  const [oldDeck, setOldDeck] = useState(null);
  
  // インポート/エクスポート用
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [importText, setImportText] = useState("");
  
  // 画像生成用
  const generatorRef = useRef(null);
  const [targetDeckForImage, setTargetDeckForImage] = useState({ name: "", cards: [] });
  const [showGenerator, setShowGenerator] = useState(false);

  const navigate = useNavigate();
  const user = auth.currentUser;
  
  // ... (省略) ...

  const handleGenerateImage = (e, deck) => {
    e.stopPropagation();
    if (!deck.cards || deck.cards.length === 0) {
      alert("カードがないデッキは画像化できません");
      return;
    }
    setTargetDeckForImage({ name: deck.name, cards: deck.cards });
    setShowGenerator(true);
  };

  // ... (省略) ...

  return (
    <div style={{ padding: "15px", maxWidth: "800px", margin: "0 auto", paddingBottom: "80px" }}>
      
      {/* ... (省略) ... */}

      <div style={{ display: "grid", gap: "10px" }}>
        {decks.length === 0 && !oldDeck && <p style={{ color: "#777", textAlign: "center", padding: "20px" }}>デッキがまだありません</p>}
        
        {decks.map((deck) => (
          <div 
            key={deck.id} 
            onClick={() => navigate(`/deck/edit/${deck.id}`)}
            className="card-box"
            style={{ display: "flex", gap: "10px", alignItems: "center", cursor: "pointer", transition: "background 0.2s" }}
          >
            {/* ... (リストアイテムの中身) ... */}
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: "1rem", fontWeight: "bold", color: "#fff", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {deck.name || "名称未設定デッキ"}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", color: "#aaa", background: "#333", padding: "2px 6px", borderRadius: "4px" }}>
                  {deck.cards?.length || 0}枚
                </span>
                {deck.tags && deck.tags.map((tag, i) => (
                  <span key={i} style={{ fontSize: "0.75rem", color: "#81d4fa", background: "rgba(33, 150, 243, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <button onClick={(e) => handlePostToBBS(e, deck)} className="btn btn-success" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                掲示板に投稿
              </button>
              <button onClick={(e) => handleGenerateImage(e, deck)} className="btn btn-primary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                画像保存
              </button>
              <button onClick={(e) => handleShare(e, deck)} className="btn btn-outline" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
                共有
              </button>
              <button onClick={(e) => handleDelete(e, deck.id)} className="btn" style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#ff6b6b", border: "1px solid #ff6b6b", background: "transparent" }}>
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeckImageGenerator 
        ref={generatorRef} 
        visible={showGenerator}
        onClose={() => setShowGenerator(false)}
        deckName={targetDeckForImage.name} 
        cards={targetDeckForImage.cards} 
      />
    </div>
  );
}
