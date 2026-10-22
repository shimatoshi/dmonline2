const KEY = "dm_game_hint_seen";
export const shouldShowHintFirst = () => {
  try { return !localStorage.getItem(KEY); } catch { return false; }
};
export const markHintSeen = () => {
  try { localStorage.setItem(KEY, "1"); } catch { /* 保存できなくても動作に影響なし */ }
};
