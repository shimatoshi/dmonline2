import { useState } from "react";

export const SideControlMenu = ({ 
  onShuffle, 
  onViewTemp, 
  onToggleInteract, 
  interactionMode, 
  tempZoneCount 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button - ChatSidebar (50%) と被らないように少し上に配置 */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed", top: "25%", left: 0, 
          background: "#333", color: "white", border: "1px solid #555",
          borderRadius: "0 8px 8px 0", padding: "12px 4px", zIndex: 3000,
          cursor: "pointer", boxShadow: "2px 0 5px rgba(0,0,0,0.5)",
          fontSize: "0.9rem"
        }}
      >
        {isOpen ? "◀" : "≡"}
      </button>

      {/* Menu Content */}
      {isOpen && (
        <div style={{
          position: "fixed", top: "25%", left: "35px", 
          background: "rgba(20, 20, 20, 0.95)", border: "1px solid #444", borderRadius: "8px",
          padding: "12px", display: "flex", flexDirection: "column", gap: "10px",
          zIndex: 2999, width: "160px", boxShadow: "0 0 10px black"
        }}>
          <div style={{fontSize:"0.8rem", color:"#aaa", borderBottom:"1px solid #444", paddingBottom:"4px", marginBottom:"4px"}}>
            メニュー
          </div>
          
          <button 
            className="btn" onClick={() => { onToggleInteract(); setIsOpen(false); }} 
            style={{ 
              fontSize: "0.85rem", 
              background: interactionMode ? "#dc3545" : "#555", 
              color: "white", border: interactionMode ? "1px solid #ffaaaa" : "1px solid #666" 
            }}
          >
            {interactionMode ? "干渉中..." : "⚡ 相手に干渉"}
          </button>

          <button className="btn" onClick={() => { onShuffle(); setIsOpen(false); }} style={{fontSize: "0.85rem", background: "#28a745", color: "white"}}>
             🔀 シャッフル
          </button>

          <button className="btn" onClick={() => { onViewTemp(); setIsOpen(false); }} style={{fontSize: "0.85rem", background: "#6f42c1", color: "white"}}>
             一時ゾーン ({tempZoneCount})
          </button>
        </div>
      )}
    </>
  );
};
