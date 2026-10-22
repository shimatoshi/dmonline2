// 全ゾーン共通の「一覧」ボタン。見た目をここで統一する。
export const ListButton = ({ onClick, active, style }) => (
  <button
    className="btn-mini"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{ whiteSpace: "nowrap", padding: "2px 4px", flexShrink: 0, ...(active ? { background: "var(--accent-color)", color: "#fff" } : {}), ...style }}
  >📋一覧</button>
);
