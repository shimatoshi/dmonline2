// 旧図鑑 → 新図鑑 移行期間の掲示
export const MIGRATION_DEADLINE = "2026年11月21日";

export default function MigrationBanner({ isOld }) {
  return (
    <div style={{ background: "#3a2f10", border: "1px solid #8a6d1d", color: "#ffd77a", padding: "8px 12px", margin: "8px", borderRadius: "var(--radius-md)", fontSize: "0.8rem", lineHeight: 1.5 }}>
      📢 図鑑は公式データをもとにした「新図鑑」へ移行します。旧図鑑は {MIGRATION_DEADLINE} まで利用できます。
      {isOld && " 期限後は旧図鑑の個別サポートは行いません。"}
    </div>
  );
}
