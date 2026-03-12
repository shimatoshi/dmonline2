// src/utils/apiConfig.js

// 同一オリジンの相対パスを使用（どのサーバーでも動作する）
export const API_BASE_URL = "";

/**
 * 画像URLをプロキシ経由のURLに変換する関数
 * 直リンク(https://...) を /api/image?url=... に変換します
 */
export const getProxyImageUrl = (originalUrl) => {
  if (!originalUrl) return "/card_back.jpg"; // URLがないなら裏面

  if (typeof originalUrl !== 'string') {
    console.warn("getProxyImageUrl received non-string url:", originalUrl);
    return "/card_back.jpg";
  }

  // 既にローカル画像("/...")の場合はそのまま返す
  if (originalUrl.startsWith("/")) return originalUrl;

  // それ以外（外部直リンク）ならプロキシ経由にする
  // URLエンコードを忘れずに
  return `/api/image?url=${encodeURIComponent(originalUrl)}`;
};

