/**
 * 外部画像URLをサーバー側で取得させ、自サーバー配信URLに変換する
 * @param {string} externalUrl
 * @returns {Promise<string|null>} /api/uploads/... のURL、失敗時はnull
 */
export const fetchImageViaServer = async (externalUrl) => {
  if (!externalUrl) return null;
  try {
    const { getApiBaseUrl } = await import("./apiConfig");
    const res = await fetch(`${getApiBaseUrl()}/api/fetch-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: externalUrl }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    console.error("Server fetch failed:", await res.text());
    return null;
  } catch (err) {
    console.error("Server fetch error:", err);
    return null;
  }
};

/**
 * ファイルをBase64変換してAPIにアップロードし、URLを返す
 * @param {File} file
 * @returns {Promise<string|null>} アップロードされた画像のURL、失敗時はnull
 */
export const uploadImage = async (file) => {
  if (!file) return null;

  try {
    const reader = new FileReader();
    const base64Data = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const { getApiBaseUrl } = await import("./apiConfig");
    const res = await fetch(`${getApiBaseUrl()}/api/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Data }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.url;
    }

    console.error("Upload failed:", await res.text());
    return null;
  } catch (err) {
    console.error("Upload error:", err);
    return null;
  }
};
