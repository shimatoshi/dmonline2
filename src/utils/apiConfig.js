// src/utils/apiConfig.js

// Loophole経由の公開URL (HTTPS対応)
export const API_BASE_URL = "https://parenting-ward-marion-interfaces.trycloudflare.com";

/**
 * 画像URLをプロキシ経由のURLに変換する関数
 * 直リンク(https://...) を http://PC_IP/api/image?url=... に変換します
 */
export const getProxyImageUrl = (originalUrl) => {
  if (!originalUrl) return "/card_back.jpg"; // URLがないなら裏面
  
  if (typeof originalUrl !== 'string') {
    console.warn("getProxyImageUrl received non-string url:", originalUrl);
    return "/card_back.jpg";
  }

  // 既にローカル画像("/...")の場合はそのまま返す
  if (originalUrl.startsWith("/")) return originalUrl;

  // GitHub Release画像はプロキシ不要（直接アクセス可能）
  if (originalUrl.includes("github.com/") && originalUrl.includes("/releases/download/")) return originalUrl;

  // 既にPCサーバー経由になっている場合はそのまま返す（無限ループ防止）
  if (originalUrl.startsWith(API_BASE_URL)) return originalUrl;

  // それ以外（外部直リンク）ならプロキシ経由にする
  // URLエンコードを忘れずに
  return `${API_BASE_URL}/api/image?url=${encodeURIComponent(originalUrl)}`;
};

