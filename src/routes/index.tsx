import { createFileRoute } from "@tanstack/react-router";
import { AppProviders } from "@/components/app-providers";
import { TopHeader } from "@/components/top-header";
import { RouteReview } from "@/components/route-review";

const title = "Kinza VRP Engine — مراجعة مسارات أسطول جدة";
const description =
  "منصة كنزة لتحسين المسارات: متابعة حية لشاحنات التوزيع ومساراتها في جدة على خريطة Google، بالعربية والإنجليزية.";

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
    <AppProviders>
      <main className="flex h-screen flex-col overflow-hidden bg-background">
        <TopHeader />
        <div className="min-h-0 flex-1 overflow-auto">
          <RouteReview />
        </div>
      </main>
    </AppProviders>
  );
}
