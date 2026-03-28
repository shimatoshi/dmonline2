import { useState } from "react";
import { getProxyImageUrl } from "../utils/apiConfig";

export default function CardRegister({ onRegister, existingTags }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [cost, setCost] = useState(""); // ★コスト追加
  const [extraFaces, setExtraFaces] = useState([""]); // 超次元用：追加面URL
  const [showFaces, setShowFaces] = useState(false); // 面入力エリア表示

  const [selectedTags, setSelectedTags] = useState([]);
  const [manualTag, setManualTag] = useState("");
  const [selectedCivs, setSelectedCivs] = useState([]);
  const [isTagsListOpen, setIsTagsListOpen] = useState(false);

  const defaultTags = ["S・トリガー", "ブロッカー", "スピードアタッカー", "マナ加速", "初動", "切札", "進化", "呪文"];
  const tagCandidates = Array.from(new Set([...defaultTags, ...existingTags]));

  const civilizations = [
    { name: "光", color: "#ffee58", tag: "光文明", textColor: "#333" },
    { name: "水", color: "#42a5f5", tag: "水文明", textColor: "#fff" },
    { name: "闇", color: "#757575", tag: "闇文明", textColor: "#fff" },
    { name: "火", color: "#ef5350", tag: "火文明", textColor: "#fff" },
    { name: "自然", color: "#66bb6a", tag: "自然文明", textColor: "#fff" },
    { name: "ゼロ", color: "#b0b0b0", tag: "ゼロ文明", textColor: "#333" }, // ★ゼロ文明追加
  ];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const toggleCiv = (civName) => {
    if (selectedCivs.includes(civName)) {
      setSelectedCivs(selectedCivs.filter(c => c !== civName));
    } else {
      setSelectedCivs([...selectedCivs, civName]);
    }
  };

  const addManualTag = () => {
    const val = manualTag.trim();
    if (!val) return;
    if (!selectedTags.includes(val)) setSelectedTags([...selectedTags, val]);
    setManualTag("");
  };

  const handleRegister = () => {
    let finalTags = [...selectedTags];
    selectedCivs.forEach(civName => {
      const civData = civilizations.find(c => c.name === civName);
      if (civData) finalTags.push(civData.tag);
    });

    if (selectedCivs.length >= 2) finalTags.push("多色");
    // ゼロ文明も選択されておらず、文明もない場合は無色タグをつけるか？
    // 今回は「ゼロ文明」ボタンがあるので、明示的に選ばせる運用とします。

    if (manualTag.trim() && !selectedTags.includes(manualTag.trim())) {
      finalTags.push(manualTag.trim());
    }

    // faces配列を構築 (メインURL + 入力された追加面)
    const validExtraFaces = extraFaces.filter(f => f.trim());
    const faces = validExtraFaces.length > 0 ? [url, ...validExtraFaces] : null;

    // コストを含めて親コンポーネントへ渡す
    onRegister(name, url, Array.from(new Set(finalTags)), cost, faces);

    setName("");
    setUrl("");
    setCost("");
    setExtraFaces([""]);
    setShowFaces(false);
    setSelectedTags([]);
    setSelectedCivs([]);
    setManualTag("");
  };

  return (
    <div className="card-box" style={{ marginBottom: "20px" }}>
      <h4 style={{ margin: "0 0 15px 0", fontSize: "1.1rem", borderBottom:"1px solid #333", paddingBottom:"10px", color: "#e0e0e0" }}>
        新規カード登録
      </h4>
      
      {url && (
        <div style={{ textAlign: "center", marginBottom: "15px", background: "#000", padding: "10px", borderRadius: "8px" }}>
          <img src={getProxyImageUrl(url)} alt="プレビュー" style={{ maxHeight: "150px", maxWidth: "100%" }} onError={(e) => e.target.style.display = 'none'} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
        <input 
          className="input-field"
          placeholder="カード名" value={name} onChange={e => setName(e.target.value)} 
        />
        <div style={{ display: "flex", gap: "10px" }}>
           <input 
            type="number"
            className="input-field"
            placeholder="コスト" 
            value={cost} 
            onChange={e => setCost(e.target.value)} 
            style={{ width: "80px" }}
          />
          <input 
            className="input-field"
            placeholder="画像URL (https://...)" value={url} onChange={e => setUrl(e.target.value)} 
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* 超次元カード面設定 */}
      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={() => setShowFaces(!showFaces)}
          style={{ fontSize: "0.8rem", background: "none", border: "1px solid #00bfff", color: "#00bfff", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}
        >
          {showFaces ? "▲ 超次元面を閉じる" : "＋ 超次元カード（複数面）"}
        </button>

        {showFaces && (
          <div style={{ marginTop: "10px", padding: "10px", background: "#1a2a3a", borderRadius: "6px", border: "1px solid #00bfff" }}>
            <p style={{ fontSize: "0.8rem", color: "#00bfff", margin: "0 0 8px 0" }}>追加面のURL（覚醒・リンク先など）:</p>
            {extraFaces.map((face, i) => (
              <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                <input
                  className="input-field"
                  placeholder={`面${i + 2}のURL`}
                  value={face}
                  onChange={(e) => {
                    const newFaces = [...extraFaces];
                    newFaces[i] = e.target.value;
                    setExtraFaces(newFaces);
                  }}
                  style={{ flex: 1 }}
                />
                {extraFaces.length > 1 && (
                  <button onClick={() => setExtraFaces(extraFaces.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: "1rem" }}>×</button>
                )}
              </div>
            ))}
            {extraFaces.length < 3 && (
              <button onClick={() => setExtraFaces([...extraFaces, ""])}
                style={{ fontSize: "0.75rem", background: "none", border: "1px dashed #555", color: "#aaa", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}>
                ＋ 面を追加（最大4面）
              </button>
            )}
          </div>
        )}
      </div>

      {/* 文明選択 */}
      <div style={{ marginBottom: "15px" }}>
        <p style={{ fontSize: "0.85rem", margin: "0 0 8px 0", color: "#aaa" }}>文明:</p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-start", flexWrap: "wrap" }}>
          {civilizations.map((civ) => (
            <button
              key={civ.name}
              onClick={() => toggleCiv(civ.name)}
              style={{
                width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #555",
                background: civ.color,
                fontWeight: "bold", 
                color: civ.textColor,
                boxShadow: selectedCivs.includes(civ.name) ? "0 0 0 3px #fff" : "none",
                transform: selectedCivs.includes(civ.name) ? "scale(1.1)" : "scale(1)",
                transition: "all 0.15s"
              }}
            >
              {civ.name}
            </button>
          ))}
        </div>
      </div>

      {/* タグ設定エリア */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "0.85rem", margin: 0, color: "#aaa" }}>タグ設定:</p>
          <button 
            onClick={() => setIsTagsListOpen(!isTagsListOpen)}
            style={{ fontSize: "0.8rem", background: "none", border: "none", color: "#007bff", padding: "5px" }}
          >
            {isTagsListOpen ? "▲ リストを閉じる" : "▼ リストから選ぶ"}
          </button>
        </div>
        
        {selectedTags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px", padding: "8px", background: "#222", borderRadius: "6px" }}>
            {selectedTags.map(tag => (
              <span key={tag} style={{ fontSize: "0.85rem", background: "#007bff", color: "white", padding: "4px 10px", borderRadius: "15px", display: "flex", alignItems: "center" }}>
                {tag} <button onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))} style={{ background: "none", border: "none", color: "white", marginLeft: "6px", fontSize: "1rem", lineHeight: "1" }}>×</button>
              </span>
            ))}
          </div>
        )}
        
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <input 
            className="input-field"
            placeholder="カスタムタグ..." value={manualTag} onChange={e => setManualTag(e.target.value)} 
          />
          <button className="btn btn-outline" onClick={addManualTag} style={{ whiteSpace: "nowrap" }}>追加</button>
        </div>

        {isTagsListOpen && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", animation: "fadeIn 0.2s", background: "#1a1a1a", padding: "10px", borderRadius: "8px", border: "1px solid #333" }}>
            {tagCandidates.map(tag => (
              <button
                key={tag} onClick={() => toggleTag(tag)} disabled={selectedTags.includes(tag)}
                style={{ 
                  fontSize: "0.8rem", padding: "6px 10px", borderRadius: "15px", border: "1px solid #444", 
                  background: "#2c2c2c", 
                  color: "#e0e0e0",
                  opacity: selectedTags.includes(tag) ? 0.3 : 1 
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="btn btn-success" onClick={handleRegister} style={{ width: "100%", padding: "12px", fontSize: "1rem" }}>
        登録して保存
      </button>
    </div>
  );
}
