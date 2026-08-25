import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · AlMugren AI Factory OS" },
      { name: "description", content: "Items, stock balances and transactions." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Package}
      titleAr="المخزون"
      titleEn="Inventory"
      descAr="إدارة الأصناف والأرصدة والحركات"
      descEn="Items, stock balances and transactions."
    />
  ),
});

