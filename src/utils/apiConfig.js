// src/utils/apiConfig.js

const RESOLVE_URL = "https://url-board.vercel.app/api/resolve/dmonline2";

// 起動時にトンネルURLを解決して保持する
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
    }
  } catch (e) {
    console.warn("[apiConfig] resolve failed, using same-origin:", e);
  }
  _resolved = true;
  return _baseUrl;
};

export const getApiBaseUrl = () => _baseUrl;

/**
 * 画像URLをプロキシ経由のURLに変換する関数
 */
export const getProxyImageUrl = (originalUrl) => {
  if (!originalUrl) return "/card_back.jpg";

  if (typeof originalUrl !== 'string') {
    console.warn("getProxyImageUrl received non-string url:", originalUrl);
    return "/card_back.jpg";
  }

  // 既にローカル画像("/...")の場合はそのまま返す
  if (originalUrl.startsWith("/")) return originalUrl;

  // GitHub Release画像はプロキシ不要（直接アクセス可能）
  if (originalUrl.includes("github.com/") && originalUrl.includes("/releases/download/")) return originalUrl;

  // 既にサーバー経由になっている場合はそのまま返す
  if (_baseUrl && originalUrl.startsWith(_baseUrl)) return originalUrl;

  // それ以外（外部直リンク）ならプロキシ経由にする
  return `${_baseUrl}/api/image?url=${encodeURIComponent(originalUrl)}`;
};
