import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import { getPrintVerificationQr } from "@/lib/document-qr.functions";

export function PrintVerificationQr({ pathname }: { pathname: string }) {
  const getQr = useServerFn(getPrintVerificationQr);
  const title = useMemo(() => (typeof document !== "undefined" ? document.title : ""), []);
  const { data } = useQuery({
    queryKey: ["print-verification-qr", pathname],
    queryFn: () => getQr({ data: { pathname, title } }),
    staleTime: 60_000,
  });
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!data?.enabled || !data.token || !data.sig || typeof window === "undefined") {
      setSrc("");
      return;
    }
    const url = `${window.location.origin}/verify/document?t=${encodeURIComponent(data.token)}&s=${encodeURIComponent(data.sig)}`;
    QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 1, width: data.settings.size_px })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [data]);

  if (!data?.enabled || !src) return null;
  const atTop = data.settings.position === "header";
  return (
    <aside
      className={`fixed end-4 z-50 rounded-lg border border-slate-200 bg-white p-2 text-center shadow-sm print:shadow-none ${atTop ? "top-4" : "bottom-4"}`}
      aria-label={data.settings.label_ar}
    >
      <img src={src} alt="Document verification QR" style={{ width: data.settings.size_px, height: data.settings.size_px }} />
      <div className="mt-1 max-w-32 text-[9px] leading-tight text-slate-600">{data.settings.label_ar}</div>
    </aside>
  );
}
