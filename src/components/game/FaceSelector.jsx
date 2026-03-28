import { getProxyImageUrl } from "../../utils/apiConfig";

export const FaceSelector = ({ faceSelectCard, selectedCard, changeFace, onClose, setSelectedCard }) => {
  if (!faceSelectCard || !faceSelectCard.faces) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.9)", zIndex: 4500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h3 style={{ color: "#00bfff", marginBottom: "15px", fontSize: "1rem" }}>チェンジ先を選択</h3>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", padding: "0 20px" }}>
        {faceSelectCard.faces.map((faceUrl, i) => (
          <div key={i} onClick={() => { changeFace(selectedCard, faceUrl); onClose(); setSelectedCard(null); }}
            style={{ cursor: "pointer", border: faceUrl === faceSelectCard.url ? "3px solid #00bfff" : "2px solid #555", borderRadius: "6px", overflow: "hidden", width: "100px" }}>
            <img src={getProxyImageUrl(faceUrl)} style={{ width: "100%", display: "block" }} />
          </div>
        ))}
      </div>
      <button onClick={onClose} className="btn" style={{ marginTop: "20px", background: "#555", color: "white", padding: "8px 20px" }}>閉じる</button>
    </div>
  );
};
