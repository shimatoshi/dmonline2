// 画面を止めない軽量トースト(alert代替)
export const showToast = (message, ms = 1800) => {
  if (typeof document === "undefined") return;
  const el = document.createElement("div");
  el.textContent = message;
  el.setAttribute("role", "status");
  Object.assign(el.style, {
    position: "fixed", left: "50%", bottom: "90px", transform: "translateX(-50%)",
    background: "rgba(30,30,30,0.95)", color: "#fff", padding: "10px 16px",
    borderRadius: "8px", border: "1px solid #555", fontSize: "0.9rem",
    zIndex: "9999", pointerEvents: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
    transition: "opacity 0.3s", opacity: "1",
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; }, ms);
  setTimeout(() => el.remove(), ms + 300);
};
