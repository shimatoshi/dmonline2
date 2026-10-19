// Vercel Serverless Function: GitHub Release画像のプロキシ（固定URL・トンネル不要）
// backend/server.py の /api/image と同じ仕様（許可プレフィックスのみ）
const ALLOWED_PREFIXES = [
  "https://github.com/shimatoshi/dmonline2/releases/download/",
  "https://github.com/shimatoshi/dmonline2-images/releases/download/",
];

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target || typeof target !== "string") {
    res.status(400).send("Missing 'url' parameter");
    return;
  }
  if (!ALLOWED_PREFIXES.some((p) => target.startsWith(p))) {
    res.status(403).send("URL not allowed");
    return;
  }
  try {
    const upstream = await fetch(target, { redirect: "follow" });
    if (!upstream.ok) {
      res.status(upstream.status).send("Upstream error");
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const ext = target.split("?")[0].split(".").pop().toLowerCase();
    const types = { webp: "image/webp", png: "image/png", gif: "image/gif", jpg: "image/jpeg", jpeg: "image/jpeg" };
    res.setHeader("Content-Type", types[ext] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).send(String(e));
  }
}
