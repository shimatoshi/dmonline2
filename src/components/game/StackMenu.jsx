export const StackMenu = ({ stackTarget, selectedCard, performStack, setStackTarget, setSelectedCard }) => {
  if (!stackTarget) return null;

  return (
    <div style={{ 
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", 
      zIndex: 3000, background: "rgba(0,0,0,0.95)", padding: "15px 20px", borderRadius: "10px", border: "1px solid #007bff", textAlign: "center", whiteSpace: "nowrap",
      boxShadow: "0 4px 15px rgba(0,0,0,0.8)"
    }}>
      <p style={{margin: "0 0 15px 0", fontSize:"1rem", fontWeight: "bold", color: "#fff"}}>カードを重ねる</p>
      <div style={{display:"flex", gap:"15px", marginBottom: "15px"}}>
        <button 
          className="btn btn-primary" 
          onClick={() => { performStack(selectedCard, stackTarget, "evolve"); setSelectedCard(null); setStackTarget(null); }} 
          style={{fontSize:"0.9rem", padding:"8px 15px"}}
        >
          進化 / 上に乗せる
        </button>
        <button 
          className="btn btn-outline" 
          onClick={() => { performStack(selectedCard, stackTarget, "under"); setSelectedCard(null); setStackTarget(null); }} 
          style={{fontSize:"0.9rem", padding:"8px 15px", borderColor:"#555", color: "#ddd"}}
        >
          下に入れる
        </button>
        <button 
          className="btn btn-outline" 
          onClick={() => { performStack(selectedCard, stackTarget, "seal"); setSelectedCard(null); setStackTarget(null); }} 
          style={{fontSize:"0.9rem", padding:"8px 15px", borderColor:"#ff6b6b", color:"#ff6b6b"}}
        >
          封印
        </button>
      </div>
      <button 
        className="btn" 
        onClick={() => setStackTarget(null)} 
        style={{width:"100%", background:"#333", padding:"8px", fontSize:"0.9rem", color: "#aaa", borderRadius: "5px"}}
      >
        キャンセル
      </button>
    </div>
  );
};
