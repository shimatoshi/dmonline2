import { useEffect, useState } from "react";
import { getProxyImageUrl } from "../../utils/apiConfig";

const EVENT = "card-zoom";

// 長押し中のカード拡大を通知する (data が null なら解除)
export const emitCardZoom = (data) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: data }));
};

export const CardZoomOverlay = () => {
  const [card, setCard] = useState(null);

  useEffect(() => {
    const handler = (e) => setCard(e.detail || null);
    window.addEventListener(EVENT, handler);
    // 指を離した・中断した・画面が隠れたときは、取りこぼしても必ず解除する
    const clear = () => setCard(null);
    const opts = true;
    ["pointerup", "pointercancel", "touchend", "touchcancel", "blur"].forEach((n) => window.addEventListener(n, clear, opts));
    document.addEventListener("visibilitychange", clear);
    return () => {
      window.removeEventListener(EVENT, handler);
      ["pointerup", "pointercancel", "touchend", "touchcancel", "blur"].forEach((n) => window.removeEventListener(n, clear, opts));
      document.removeEventListener("visibilitychange", clear);
    };
  }, []);

  if (!card?.url) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000, pointerEvents: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
      }}
    >
      <img
        src={getProxyImageUrl(card.url)}
        alt=""
        draggable={false}
        style={{
          maxHeight: "80vh", maxWidth: "80vw", aspectRatio: "2/3",
          borderRadius: "var(--radius-lg)", boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
          transform: card.isTapped ? "rotate(90deg)" : "none",
        }}
      />
    </div>
  );
};
