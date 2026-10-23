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

// 画像URL → カード文章。ブレイカー表記から初期ブレイク数を決める
let textMap = null;
export const ensureCardTexts = () =>
  fetch("/data/official_cards.json")
    .then((r) => r.json())
    .then((cards) => {
      textMap = new Map();
      cards.forEach((c) => { if (c.img && !textMap.has(c.img)) textMap.set(c.img, c.text || ""); });
    })
    .catch(() => { textMap = new Map(); });

const BREAKER = { W: 2, Ｗ: 2, T: 3, Ｔ: 3, Q: 4, Ｑ: 4, M: 5, Ｍ: 5 };
// 行頭の「W・ブレイカー」「T・ブレイカー」等のみ対象(「〜を得る」などの付与や引用は含めない)。見つからなければ1
export const getBreakCount = (url) => {
  const text = (textMap && url && textMap.get(url)) || "";
  let n = 1;
  text.split(/[\r\n]+/).forEach((line) => {
    const m = line.match(/^[\s■◆・]*(?:スター・)?(W|Ｗ|T|Ｔ|Q|Ｑ|M|Ｍ|ワールド|∞)/);
    if (!m || !/ブレイカー/.test(line.slice(0, 20))) return;
    n = Math.max(n, BREAKER[m[1]] || 99);
  });
  return n;
};
