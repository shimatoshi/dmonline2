// 操作ヒント(初回のみ自動表示。ヘッダーの「?」で再表示)
const ITEMS = [
  ["タップ", "マナ・バトルゾーンのカードは寝かせる/起こす。手札は選択"],
  ["長押し", "メニューを開く(拡大・山札の上下・伏せ・重なり確認など)"],
  ["ドラッグ", "別のゾーンへ移動。置ける場所は黄色、置けない場所は赤で表示"],
  ["カードに重ねる", "バトルゾーンのカードの上に離すと、進化・下に入れる・封印を選べる"],
  ["↩ 戻す", "直前の自分の操作を取り消す"],
];

export const GameHint = ({ onClose }) => (
  <div className="overlay overlay-dark" onClick={onClose} style={{ zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface-color)", border: "1px solid var(--border-color-dark)", borderRadius: "var(--radius-lg)", padding: "16px", maxWidth: "420px", width: "100%" }}>
      <h3 style={{ margin: "0 0 12px", color: "#fff", fontSize: "1.05rem" }}>操作のヒント</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {ITEMS.map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: "10px", fontSize: "0.9rem", lineHeight: 1.4 }}>
            <span style={{ flexShrink: 0, minWidth: "92px", color: "#ffd54f", fontWeight: "bold" }}>{k}</span>
            <span style={{ color: "#ddd" }}>{v}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={onClose} style={{ width: "100%", minHeight: "44px", marginTop: "16px" }}>わかった</button>
    </div>
  </div>
);
