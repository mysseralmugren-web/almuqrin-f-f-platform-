import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { ModulePlaceholder } from "@/components/app/module-placeholder";

export const Route = createFileRoute("/_authenticated/erp")({
  head: () => ({
    meta: [
      { title: "Enterprise Resource Planning · AlMugren AI Factory OS" },
      { name: "description", content: "Unified enterprise resource planning module." },
    ],
  }),
  component: () => (
    <ModulePlaceholder
      icon={Boxes}
      titleAr="تخطيط موارد المؤسسة"
      titleEn="Enterprise Resource Planning"
      descAr="منظومة تخطيط موارد المؤسسة الموحدة"
      descEn="Unified enterprise resource planning module."
    />
  ),
});

