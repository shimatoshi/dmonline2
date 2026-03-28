import { getProxyImageUrl } from "../../utils/apiConfig";

export const FaceSelector = ({ faceSelectCard, selectedCard, changeFace, onClose, setSelectedCard }) => {
  if (!faceSelectCard || !faceSelectCard.faces) return null;

  return (
    <div className="overlay overlay-dark" style={{ zIndex: 4500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h3 style={{ color: "var(--info-color)", marginBottom: "15px", fontSize: "1rem" }}>チェンジ先を選択</h3>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", padding: "0 20px" }}>
        {faceSelectCard.faces.map((faceUrl, i) => (
          <div key={i} onClick={() => { changeFace(selectedCard, faceUrl); onClose(); setSelectedCard(null); }}
            style={{ cursor: "pointer", border: faceUrl === faceSelectCard.url ? "3px solid var(--info-color)" : "2px solid var(--border-color-dark)", borderRadius: "6px", overflow: "hidden", width: "100px" }}>
            <img src={getProxyImageUrl(faceUrl)} style={{ width: "100%", display: "block" }} />
          </div>
        ))}
      </div>
      <button onClick={onClose} className="btn" style={{ marginTop: "20px", background: "var(--border-color-dark)", color: "white", padding: "8px 20px" }}>閉じる</button>
    </div>
  );
};
