import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/mes")({
  head: () => ({
    meta: [
      { title: "أوامر التصنيع MES · AlMugren AI Factory OS" },
      { name: "description", content: "Manufacturing orders, production stages, BOM, materials and quality gates." },
      { property: "og:title", content: "أوامر التصنيع MES · AlMugren AI Factory OS" },
      { property: "og:description", content: "Manufacturing orders, stages, BOM, materials and quality control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});

