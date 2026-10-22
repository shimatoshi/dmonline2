// 画像URL → カード名(公式カードデータ)。ログ表示用。読み込み前は null を返す
let nameMap = null;
let loading = null;

export const ensureCardNames = () => {
  if (nameMap || loading) return loading;
  loading = fetch("/data/official_cards.json")
    .then((r) => r.json())
    .then((cards) => {
      nameMap = new Map();
      cards.forEach((c) => { if (c.img && !nameMap.has(c.img)) nameMap.set(c.img, c.name); });
    })
    .catch(() => { nameMap = new Map(); });
  return loading;
};

export const getCardName = (url) => (nameMap && url ? nameMap.get(url) || null : null);
