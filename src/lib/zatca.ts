// ZATCA (Phase 1) simplified tax invoice QR — TLV encoded, Base64 output.
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

function tlv(tag: number, value: string): Uint8Array {
  const v = new TextEncoder().encode(value);
  const buf = new Uint8Array(v.length + 2);
  buf[0] = tag;
  buf[1] = v.length;
  buf.set(v, 2);
  return buf;
}

export interface ZatcaQrInput {
  sellerName: string;
  vatNumber: string;
  timestamp: string; // ISO 8601
  total: number; // total including VAT
  vatAmount: number;
}

export function buildZatcaQr(input: ZatcaQrInput): string {
  const parts = [
    tlv(1, input.sellerName),
    tlv(2, input.vatNumber),
    tlv(3, input.timestamp),
    tlv(4, input.total.toFixed(2)),
    tlv(5, input.vatAmount.toFixed(2)),
  ];
  const size = parts.reduce((n, p) => n + p.length, 0);
  const all = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    all.set(p, offset);
    offset += p.length;
  }
  return toBase64(all);
}

