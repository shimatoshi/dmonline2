import { useState, useMemo } from "react";
import { getProxyImageUrl } from "../utils/apiConfig";

export default function CardLibrary({ library, onAddToDeck, onDelete, onUpdate, existingTags }) {
  const [filterTag, setFilterTag] = useState("ALL");
  const [searchName, setSearchName] = useState("");
  const [searchCost, setSearchCost] = useState(""); // ★コスト検索用
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ name: "", url: "", tags: [], cost: "", newTag: "" });

  const startEditing = (card) => {
    setEditingId(card.id);
    setEditData({ 
      name: card.name, 
      url: card.url, 
      tags: card.tags || [], 
      cost: card.cost || "", // コストも編集可能に
      newTag: "" 
    });
  };

  const cancelEditing = () => { setEditingId(null); setEditData(null); };
  
  const saveEditing = () => {
    onUpdate(editingId, { 
      name: editData.name, 
      url: editData.url, 
      tags: editData.tags,
      cost: editData.cost // コスト更新
    });
    setEditingId(null);
  };

  const removeEditTag = (tag) => { setEditData({ ...editData, tags: editData.tags.filter(t => t !== tag) }); };
  
  const addEditTag = () => {
    const val = editData.newTag.trim();
    if (val && !editData.tags.includes(val)) {
      setEditData({ ...editData, tags: [...editData.tags, val], newTag: "" });
    }
  };

  const filteredCards = useMemo(() => library.filter(card => {
    const tagMatch = filterTag === "ALL" || (card.tags && card.tags.includes(filterTag));
    const nameMatch = card.name && card.name.toLowerCase().includes(searchName.toLowerCase());
    const costMatch = searchCost === "" || (card.cost != null && String(card.cost) === searchCost);
    return tagMatch && nameMatch && costMatch;
  }), [library, filterTag, searchName, searchCost]);

  return (
    <div className="card-box" style={{ border: "none", padding: 0, background: "transparent" }}>
      <h3 style={{ margin: "0 0 15px 0", borderLeft: "5px solid #007bff", paddingLeft: "15px" }}>カード図鑑</h3>
      
      {/* 検索 & フィルタ */}
      <div className="card-box" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          {/* コスト検索欄 */}
          <input 
            className="input-field"
            type="number" 
            placeholder="コスト" 
            value={searchCost}
            onChange={(e) => setSearchCost(e.target.value)}
            style={{ width: "80px" }}
          />
          <input 
            className="input-field"
            type="text" 
            placeholder="カード名で検索..." 
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.9rem", color: "#aaa" }}>
            絞り込み: <span style={{color:"white", fontWeight:"bold"}}>{filterTag !== "ALL" ? filterTag : "すべて"}</span>
          </span>
          <button 
            onClick={() => setIsTagsExpanded(!isTagsExpanded)}
            style={{ fontSize: "0.9rem", background: "none", border: "none", color: "#007bff", padding: "10px" }}
          >
            {isTagsExpanded ? "▲ 閉じる" : "▼ タグ選択"}
          </button>
        </div>

        {isTagsExpanded && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", animation: "fadeIn 0.2s" }}>
            <button 
              onClick={() => setFilterTag("ALL")}
              style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid #555", background: filterTag === "ALL" ? "#e0e0e0" : "#333", color: filterTag === "ALL" ? "#000" : "#fff" }}
            >
              すべて
            </button>
            {existingTags.map(tag => (
              <button 
                key={tag} onClick={() => setFilterTag(tag)}
                style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid #555", background: filterTag === tag ? "#007bff" : "#333", color: "#fff" }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* カード一覧 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: "12px" }}>
        {filteredCards.length === 0 && <p style={{ color: "#777", gridColumn: "1 / -1", textAlign: "center", padding: "20px" }}>該当なし</p>}
        
        {filteredCards.map((card) => {
          if (editingId === card.id) {
            // 編集モード
            return (
              <div key={card.id} className="card-box" style={{ gridColumn: "span 2", borderColor: "#007bff" }}>
                <div style={{marginBottom: "10px", fontWeight: "bold", color: "#007bff"}}>編集中</div>
                <div style={{display:"flex", gap:"5px", marginBottom:"8px"}}>
                   <input className="input-field" type="number" value={editData.cost} onChange={(e) => setEditData({...editData, cost: e.target.value})} placeholder="コスト" style={{ width: "60px" }} />
                   <input className="input-field" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} placeholder="名前" style={{ flex: 1 }} />
                </div>
                <input className="input-field" value={editData.url} onChange={(e) => setEditData({...editData, url: e.target.value})} placeholder="URL" style={{ marginBottom: "8px" }} />
                
                <div style={{ background: "#222", padding: "10px", marginBottom: "10px", borderRadius: "6px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                    {editData.tags.map(tag => (
                      <span key={tag} style={{ background: "#444", fontSize: "0.8rem", padding: "4px 8px", borderRadius: "4px", color: "#fff" }}>
                        {tag} <span onClick={() => removeEditTag(tag)} style={{ color: "#ff6b6b", marginLeft:"5px", fontWeight: "bold" }}>×</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <input className="input-field" value={editData.newTag} onChange={(e) => setEditData({...editData, newTag: e.target.value})} placeholder="タグ追加" style={{ padding: "8px" }} />
                    <button className="btn btn-outline" onClick={addEditTag}>+</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn btn-primary" onClick={saveEditing} style={{ flex: 1 }}>保存</button>
                  <button className="btn btn-outline" onClick={cancelEditing} style={{ flex: 1 }}>中止</button>
                </div>
              </div>
            );
          }

          // 通常表示
          return (
            <div key={card.id} style={{ background: "#252525", borderRadius: "8px", overflow: "hidden", border: "1px solid #333", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", cursor: onAddToDeck ? "pointer" : "default", flex: 1 }} onClick={() => onAddToDeck?.(card.url)}>
                <img src={getProxyImageUrl(card.url)} alt={card.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", aspectRatio: "2/3" }} />

                {card.cost && <div className="badge badge-cost">{card.cost}</div>}
                {card.faces && card.faces.length > 1 && (
                  <div className="badge badge-faces" style={{ top: "4px", right: "4px", width: "22px", height: "22px", fontSize: "0.7rem", border: "1px solid #333", zIndex: 5 }}>
                    {card.faces.length}
                  </div>
                )}

                <div style={{ position: "absolute", bottom: 0, width: "100%", background: "rgba(0,0,0,0.7)", color: "white", fontSize: "0.75rem", padding: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {card.name}
                </div>
              </div>
              
              <div style={{ padding: "8px 4px", display: "flex", justifyContent: "space-around", background: "#1e1e1e", borderTop: "1px solid #333" }}>
                <button onClick={() => startEditing(card)} style={{ fontSize: "0.8rem", padding: "6px 10px", border: "1px solid #555", background: "transparent", color: "#aaa", borderRadius: "4px" }}>編集</button>
                <button onClick={() => onDelete(card.id)} style={{ fontSize: "0.8rem", padding: "6px 10px", color: "#ff6b6b", border: "none", background: "transparent" }}>削除</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
