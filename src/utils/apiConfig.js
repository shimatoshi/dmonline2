// src/utils/apiConfig.js
import cardImages from "../data/cardImages.json";

const RESOLVE_URL = "https://url-board.vercel.app/api/resolve/dmonline2";

let _baseUrl = "";
let _resolved = false;

export const resolveApiBase = async () => {
  if (_resolved) return _baseUrl;
  try {
    const res = await fetch(RESOLVE_URL);
    if (res.ok) {
      const data = await res.json();
      _baseUrl = data.url || "";
      console.log("[apiConfig] resolved:", _baseUrl);
      // オフライン時のフォールバック用に記憶しておく
      try { localStorage.setItem("apiBaseUrl", _baseUrl); } catch { /* ignore */ }
    }
  } catch (e) {
    // オフライン等で解決できない場合は前回のURLを使う
    const cached = (() => { try { return localStorage.getItem("apiBaseUrl"); } catch { return null; } })();
    if (cached) {
      _baseUrl = cached;
      console.warn("[apiConfig] resolve failed, using cached:", cached);
    } else {
      console.warn("[apiConfig] resolve failed, using same-origin:", e);
    }
  }
  _resolved = true;
  return _baseUrl;
};

export const getApiBaseUrl = () => _baseUrl;

// カード名 → GitHub Release URL のマップを構築
const _cardImageMap = new Map();
for (const card of cardImages) {
  if (!_cardImageMap.has(card.name)) {
    _cardImageMap.set(card.name, card.url);
  }
}

export const getGithubImageUrl = (cardName) => {
  if (!cardName) return null;
  return _cardImageMap.get(cardName) || null;
};

/**
 * カード画像URLを返す。
 * 外部サイトへのアクセスは一切行わない。
 * GitHub Release画像かローカル画像のみ返す。それ以外はカード裏面。
 */
export const getProxyImageUrl = (originalUrl, cardName) => {
  // カード名でGitHub Release画像があればそれを使う（下のプロキシ変換に流す）
  if (cardName) {
    const ghUrl = getGithubImageUrl(cardName);
    if (ghUrl) originalUrl = ghUrl;
  }

  if (!originalUrl || typeof originalUrl !== 'string') return "/card_back.jpg";

  // 自サーバーのアップロード画像（相対パスで保存し、表示時に現在のトンネルURLを前置する。
  // トンネルURLが変わっても保存データが壊れないようにするため）
  // ※ startsWith("/") のローカル画像判定より先に処理しないとdead codeになる
  const uploadsIdx = originalUrl.indexOf("/api/uploads/");
  if (uploadsIdx >= 0) return _baseUrl + originalUrl.slice(uploadsIdx);

  // ローカル画像
  if (originalUrl.startsWith("/")) return originalUrl;

  // GitHub Release画像 → 自サーバーのキャッシュ付きプロキシ経由で取得。
  // GitHub直リンクはCORS非対応でopaqueレスポンスになり、SWで安全にキャッシュ
  // できない（ステータス不明＆クォータの opaque padding 問題）ため。
  if (originalUrl.includes("github.com/") && originalUrl.includes("/releases/download/")) {
    return `${_baseUrl}/api/image?url=${encodeURIComponent(originalUrl)}`;
  }

  if (_baseUrl && originalUrl.startsWith(_baseUrl)) return originalUrl;

  // ★★★ 外部URLは一切アクセスしない。カード裏面を返す ★★★
  return "/card_back.jpg";
};
