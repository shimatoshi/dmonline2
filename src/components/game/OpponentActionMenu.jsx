export const OpponentActionMenu = ({ target, onClose, onAction }) => {
  if (!target) return null;
  const { zone } = target;

  return (
    <div style={{ 
       position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", 
       zIndex: 4000, background: "rgba(30, 0, 0, 0.95)", padding: "15px", borderRadius: "10px",
       boxShadow: "0 0 15px rgba(255, 0, 0, 0.5)", border: "1px solid #ff4444", textAlign: "center", minWidth: "200px"
     }}>
       <h4 style={{margin: "0 0 10px 0", color: "#ffaaaa"}}>相手のカードを操作</h4>
       
       <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px"}}>
         {/* 共通アクション */}
         <button className="btn" onClick={() => onAction("grave")} style={{background: "#dc3545", color:"white"}}>💀 墓地へ</button>
         <button className="btn" onClick={() => onAction("hand")} style={{background: "#007bff", color:"white"}}>✋ 手札へ</button>
         <button className="btn" onClick={() => onAction("mana")} style={{background: "#28a745", color:"white"}}>🌲 マナへ</button>
         <button className="btn" onClick={() => onAction("shield")} style={{background: "#ffc107", color:"black"}}>🛡️ 盾へ</button>
         
         {/* ゾーン特有のアクション */}
         {zone === "deck" && (
            <button className="btn" onClick={() => onAction("deckBottom")} style={{background: "#333", color:"white"}}>山札下へ</button>
         )}
       </div>

       <button className="btn" onClick={onClose} style={{marginTop: "15px", width: "100%", background: "#444", color:"#ccc"}}>キャンセル</button>
     </div>
  );
};
