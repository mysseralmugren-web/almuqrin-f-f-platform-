import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserSquare2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCustomers, createCustomer } from "@/lib/workflow.functions";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "العملاء · AlMugren AI Factory OS" },
      { name: "description", content: "Customer accounts for AlMugren Factory operations." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const t = useT();
  const qc = useQueryClient();
  const fetchAll = useServerFn(listCustomers);
  const create = useServerFn(createCustomer);
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchAll({}),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name_ar: "", vat_number: "", phone: "", email: "", city: "" });

  const mutation = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success(t("تم إضافة العميل", "Customer added"));
      setOpen(false);
      setForm({ name_ar: "", vat_number: "", phone: "", email: "", city: "" });
      void qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <UserSquare2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t("العملاء", "Customers")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("حسابات العملاء المرتبطة بمنشأتك", "Customer accounts scoped to your company")}
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-primary font-semibold">
              <Plus className="h-4 w-4" />
              {t("عميل جديد", "New customer")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("عميل جديد", "New customer")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {([
                ["name_ar", "اسم العميل", "Customer name", true],
                ["vat_number", "الرقم الضريبي", "VAT number", false],
                ["phone", "الجوال", "Phone", false],
                ["email", "البريد الإلكتروني", "Email", false],
                ["city", "المدينة", "City", false],
              ] as const).map(([key, ar, en, req]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key}>{t(ar, en)}</Label>
                  <Input
                    id={key}
                    required={req}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <Button type="submit" disabled={mutation.isPending} className="w-full gradient-primary">
                {t("حفظ", "Save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("العميل", "Customer")}</TableHead>
                <TableHead>{t("الرقم الضريبي", "VAT")}</TableHead>
                <TableHead>{t("الجوال", "Phone")}</TableHead>
                <TableHead>{t("المدينة", "City")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    {t("جاري التحميل...", "Loading...")}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    {t("لا يوجد عملاء بعد", "No customers yet")}
                  </TableCell>
                </TableRow>
              )}
              {customers.map((c: Record<string, string>) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name_ar}</TableCell>
                  <TableCell dir="ltr">{c.vat_number || "—"}</TableCell>
                  <TableCell dir="ltr">{c.phone || "—"}</TableCell>
                  <TableCell>{c.city || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

