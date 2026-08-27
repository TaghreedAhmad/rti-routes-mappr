import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { DashboardOverview } from "@/components/dashboard-overview";

const title = "Kinza VRP Engine — لوحة تحكم لوجستيات جدة";
const description =
  "لوحة تحكم كنزة لتحسين المسارات: مؤشرات الالتزام بالوقت، التوقفات المنفذة، توزيع الأسطول وتنبيهات التشغيل في جدة.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AppShell>
      <DashboardOverview />
    </AppShell>
  );
}
