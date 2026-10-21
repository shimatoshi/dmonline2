// 再録で同名カードが多数あるため、カード名ごとに1枚へまとめる(先頭=最も古い収録を代表にする)
export const dedupeByName = (cards) => {
  const seen = new Set();
  return cards.filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
};
