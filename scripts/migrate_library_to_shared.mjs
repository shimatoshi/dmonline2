/**
 * 移行スクリプト: users/{uid}/library → 共有 cards コレクション
 *
 * 1. 全ユーザーの library サブコレクションを取得
 * 2. URL重複チェックしつつ共有 cards に追加
 * 3. ユーザー個別タグがあれば users/{uid}/cardTags/{cardId} に保存
 *
 * 使い方:
 *   ドライラン: DRY_RUN=1 node scripts/migrate_library_to_shared.mjs
 *   本番実行:   node scripts/migrate_library_to_shared.mjs
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync(new URL("../serviceAccountKey.json", import.meta.url), "utf-8")
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const DRY_RUN = process.env.DRY_RUN === "1";

async function migrate() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== LIVE RUN ===");

  // 既存の共有cardsを取得（URL重複チェック用）
  const existingCardsSnap = await db.collection("cards").get();
  const existingUrlMap = new Map();
  existingCardsSnap.forEach((d) => {
    const data = d.data();
    if (data.url) existingUrlMap.set(data.url, d.id);
  });
  console.log(`既存の共有カード: ${existingUrlMap.size} 枚`);

  // 全ユーザーを取得（親ドキュメントが空の場合もあるのでlistDocumentsを使用）
  const userRefs = await db.collection("users").listDocuments();
  console.log(`ユーザー数: ${userRefs.length}`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalTagsSaved = 0;

  for (const userRef of userRefs) {
    const uid = userRef.id;
    const librarySnap = await db
      .collection("users")
      .doc(uid)
      .collection("library")
      .get();

    if (librarySnap.empty) continue;
    console.log(`\n[${uid}] library: ${librarySnap.size} 枚`);

    for (const cardDoc of librarySnap.docs) {
      const card = cardDoc.data();
      const url = card.url;

      if (!url) {
        console.log(`  SKIP (no url): ${card.name || "unnamed"}`);
        totalSkipped++;
        continue;
      }

      let sharedCardId;

      if (existingUrlMap.has(url)) {
        sharedCardId = existingUrlMap.get(url);
        console.log(`  EXISTS: ${card.name || url}`);
        totalSkipped++;
      } else {
        const sharedData = {
          name: card.name || "",
          url: card.url,
          cost: card.cost || null,
          tags: card.tags || [],
          createdAt: card.createdAt || new Date(),
        };

        if (DRY_RUN) {
          sharedCardId = `dry-${totalMigrated}`;
          console.log(`  ADD (dry): ${card.name || url}`);
        } else {
          const ref = await db.collection("cards").add(sharedData);
          sharedCardId = ref.id;
          console.log(`  ADD: ${card.name || url} → ${sharedCardId}`);
        }

        existingUrlMap.set(url, sharedCardId);
        totalMigrated++;
      }

      // ユーザー個別タグがあれば保存
      const userTags = card.tags || [];
      if (userTags.length > 0 && sharedCardId) {
        if (!DRY_RUN) {
          await db
            .collection("users")
            .doc(uid)
            .collection("cardTags")
            .doc(sharedCardId)
            .set({ tags: userTags });
        }
        totalTagsSaved++;
      }
    }
  }

  console.log("\n=== 結果 ===");
  console.log(`新規追加: ${totalMigrated} 枚`);
  console.log(`スキップ(重複): ${totalSkipped} 枚`);
  console.log(`個別タグ保存: ${totalTagsSaved} 件`);

  if (DRY_RUN) {
    console.log("\n※ ドライランのため実際の書き込みはしていません");
    console.log("本番実行: node scripts/migrate_library_to_shared.mjs");
  }

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
