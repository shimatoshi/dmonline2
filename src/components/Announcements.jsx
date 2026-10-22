import { useState, useEffect } from "react";

const SEEN_KEY = "dm_announcement_seen";
const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } };
const writeSeen = (id) => { try { localStorage.setItem(SEEN_KEY, id); } catch { /* 保存できなくても動作に影響なし */ } };

// お知らせ(public/data/announcements.json、新しい順)。未読があれば開いた状態で表示する
export default function Announcements() {
  const [items, setItems] = useState([]);
  const [seen, setSeen] = useState(readSeen);
  const [openState, setOpenState] = useState(null); // null=未操作(未読があれば自動で開く)

  useEffect(() => {
    let alive = true;
    fetch("/data/announcements.json")
      .then((r) => r.json())
      .then((list) => { if (alive && Array.isArray(list)) setItems(list); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (items.length === 0) return null;

  const idx = items.findIndex((a) => a.id === seen);
  const unread = idx === -1 ? items.length : idx;
  const open = openState ?? unread > 0;

  const toggle = () => {
    if (open && unread > 0) { writeSeen(items[0].id); setSeen(items[0].id); }
    setOpenState(!open);
  };

  return (
    <div style={{ marginBottom: "12px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--surface-color)" }}>
      <button onClick={toggle} style={{ width: "100%", minHeight: "44px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 12px", background: "none", border: "none", color: "var(--text-primary)", fontSize: "0.9rem", cursor: "pointer" }}>
        <span>📢 お知らせ{unread > 0 && <span style={{ marginLeft: "8px", background: "var(--danger-color)", color: "#fff", borderRadius: "var(--radius-lg)", padding: "1px 8px", fontSize: "0.75rem" }}>新着 {unread}</span>}</span>
        <span style={{ color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {items.slice(0, 12).map((a) => (
            <div key={a.id} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{a.date}</div>
              <div style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text-primary)" }}>{a.title}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, marginTop: "2px" }}>{a.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
