import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Truck, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addSupplierContact, createSupplier, listSuppliers, updateSupplier } from "@/lib/purchasing.functions";
import { SUPPLIER_STATUS } from "@/lib/purchasing-constants";
import { EmptyState, StatusPill, useFail } from "@/components/app/purchasing-ui";
import { useT } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "الموردون · AlMugren AI Factory OS" },
      { name: "description", content: "Supplier master data: VAT, CR, IBAN, payment terms, contacts and status." },
      { property: "og:title", content: "الموردون · AlMugren AI Factory OS" },
      { property: "og:description", content: "Supplier master data, banking details, terms and contacts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
});

const blank = {
  code: "",
  name_ar: "",
  name_en: "",
  vat_number: "",
  cr_number: "",
  iban: "",
  bank_name: "",
  payment_terms_days: "30",
  category: "",
  email: "",
  phone: "",
  city: "",
  address: "",
};

function SuppliersPage() {
  const t = useT();
  const qc = useQueryClient();
  const fail = useFail();

  const fetchSuppliers = useServerFn(listSuppliers);
  const addSupplier = useServerFn(createSupplier);
  const patchSupplier = useServerFn(updateSupplier);
  const addContact = useServerFn(addSupplierContact);

  const { data: suppliers = [], isLoading } = useQuery({ queryKey: ["suppliers"], queryFn: () => fetchSuppliers({}) });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["suppliers"] });

  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [contactFor, setContactFor] = useState<string>("");
  const [contact, setContact] = useState({ name: "", title: "", email: "", phone: "" });

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () =>
      addSupplier({
        data: {
          code: form.code.trim(),
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          vat_number: form.vat_number.trim(),
          cr_number: form.cr_number.trim() || null,
          iban: form.iban.trim().toUpperCase(),
          bank_name: form.bank_name.trim() || null,
          payment_terms_days: Number(form.payment_terms_days || 30),
          category: form.category.trim() || null,
          status: "active" as const,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          city: form.city.trim() || null,
          address: form.address.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(t("تم حفظ المورد", "Supplier saved"));
      setForm(blank);
      setOpen(false);
      refresh();
    },
    onError: fail,
  });

  const changeStatus = useMutation({
    mutationFn: (v: { id: string; status: "active" | "on_hold" | "blocked" }) => patchSupplier({ data: v }),
    onSuccess: () => {
      toast.success(t("تم تحديث الحالة", "Status updated"));
      refresh();
    },
    onError: fail,
  });

  const saveContact = useMutation({
    mutationFn: () =>
      addContact({
        data: {
          supplier_id: contactFor,
          name: contact.name.trim(),
          title: contact.title.trim() || null,
          email: contact.email.trim(),
          phone: contact.phone.trim() || null,
          is_primary: false,
        },
      }),
    onSuccess: () => {
      toast.success(t("تمت إضافة جهة الاتصال", "Contact added"));
      setContact({ name: "", title: "", email: "", phone: "" });
      setContactFor("");
      refresh();
    },
    onError: fail,
  });

  const filtered = (suppliers as any[]).filter((s) =>
    [s.code, s.name_ar, s.name_en, s.vat_number].filter(Boolean).some((v: string) => v.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl gradient-primary shadow-elegant">
            <Truck className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{t("الموردون", "Suppliers")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("البيانات النظامية والبنكية وشروط الدفع وجهات الاتصال", "Legal, banking, terms and contacts")}
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" />
          {t("مورد جديد", "New supplier")}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("بيانات المورد", "Supplier details")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                ["code", t("كود المورد *", "Code *")],
                ["name_ar", t("الاسم بالعربية *", "Arabic name *")],
                ["name_en", t("الاسم بالإنجليزية", "English name")],
                ["vat_number", t("الرقم الضريبي (15 رقمًا)", "VAT number (15 digits)")],
                ["cr_number", t("السجل التجاري", "CR number")],
                ["iban", t("الآيبان", "IBAN")],
                ["bank_name", t("البنك", "Bank")],
                ["payment_terms_days", t("مهلة السداد (يوم)", "Payment terms (days)")],
                ["category", t("التصنيف", "Category")],
                ["email", t("البريد الإلكتروني", "Email")],
                ["phone", t("الهاتف", "Phone")],
                ["city", t("المدينة", "City")],
                ["address", t("العنوان", "Address")],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`sup-${key}`}>{label}</Label>
                <Input id={`sup-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
            <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
              <Button
                disabled={create.isPending || form.code.trim().length === 0 || form.name_ar.trim().length < 2}
                onClick={() => create.mutate()}
              >
                {t("حفظ", "Save")}
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("بحث بالاسم أو الكود", "Search")} className="ltr:pl-9 rtl:pr-9" />
      </div>

      {isLoading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-6 w-6" />}
          title={t("لا يوجد موردون بعد", "No suppliers yet")}
          hint={t("أضف أول مورد لبدء دورة الشراء.", "Add your first supplier to start the purchasing cycle.")}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("الكود", "Code")}</TableHead>
                  <TableHead>{t("المورد", "Supplier")}</TableHead>
                  <TableHead>{t("الرقم الضريبي", "VAT")}</TableHead>
                  <TableHead>{t("مهلة السداد", "Terms")}</TableHead>
                  <TableHead>{t("جهات الاتصال", "Contacts")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name_ar}</TableCell>
                    <TableCell className="font-mono text-xs">{s.vat_number ?? "—"}</TableCell>
                    <TableCell>{s.payment_terms_days} {t("يوم", "d")}</TableCell>
                    <TableCell>{s.supplier_contacts?.length ?? 0}</TableCell>
                    <TableCell>
                      <StatusPill status={s.status} labels={SUPPLIER_STATUS} />
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Select value={s.status} onValueChange={(v) => changeStatus.mutate({ id: s.id, status: v as any })}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SUPPLIER_STATUS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {t(v.ar, v.en)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => setContactFor(contactFor === s.id ? "" : s.id)}>
                          {t("جهة اتصال", "Contact")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {contactFor ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("إضافة جهة اتصال", "Add contact")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-4">
            <Input placeholder={t("الاسم", "Name")} value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            <Input placeholder={t("المسمى", "Title")} value={contact.title} onChange={(e) => setContact({ ...contact, title: e.target.value })} />
            <Input placeholder={t("البريد", "Email")} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <Input placeholder={t("الهاتف", "Phone")} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <Button disabled={saveContact.isPending || contact.name.trim().length < 2} onClick={() => saveContact.mutate()}>
              {t("حفظ", "Save")}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

