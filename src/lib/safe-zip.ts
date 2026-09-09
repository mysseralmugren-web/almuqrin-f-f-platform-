const EOCD = 0x06054b50;
const CEN = 0x02014b50;
const LOC = 0x04034b50;

export type SafeZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  crc32: number;
  localOffset: number;
  encrypted: boolean;
};

export type SafeZipArchive = {
  entries: SafeZipEntry[];
  extract(entry: SafeZipEntry): Promise<Uint8Array>;
};

const decoder = new TextDecoder("utf-8", { fatal: true });

function u16(v: DataView, o: number) { return v.getUint16(o, true); }
function u32(v: DataView, o: number) { return v.getUint32(o, true); }

function safeName(name: string) {
  if (!name || name.includes("\0") || name.startsWith("/") || name.startsWith("\\")) return false;
  const normalized = name.replaceAll("\\", "/");
  if (normalized.split("/").some((p) => p === "..")) return false;
  return !/^[A-Za-z]:\//.test(normalized);
}

let crcTable: Uint32Array | undefined;
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") throw new Error("ZIP_DECOMPRESSION_UNSUPPORTED");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function openSafeZip(buffer: ArrayBuffer, limits?: { maxEntries?: number; maxTotalUncompressed?: number; maxEntryUncompressed?: number }): SafeZipArchive {
  const maxEntries = limits?.maxEntries ?? 5000;
  const maxTotal = limits?.maxTotalUncompressed ?? 1_500_000_000;
  const maxEntry = limits?.maxEntryUncompressed ?? 25_000_000;
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const min = Math.max(0, bytes.length - 65_557);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (u32(view, i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP_EOCD_NOT_FOUND");
  const entryCount = u16(view, eocd + 10);
  const centralSize = u32(view, eocd + 12);
  const centralOffset = u32(view, eocd + 16);
  if (entryCount > maxEntries) throw new Error("ZIP_TOO_MANY_ENTRIES");
  if (centralOffset + centralSize > bytes.length) throw new Error("ZIP_CENTRAL_DIRECTORY_INVALID");

  const entries: SafeZipEntry[] = [];
  let p = centralOffset;
  let total = 0;
  for (let i = 0; i < entryCount; i += 1) {
    if (p + 46 > bytes.length || u32(view, p) !== CEN) throw new Error("ZIP_CENTRAL_ENTRY_INVALID");
    const flags = u16(view, p + 8);
    const method = u16(view, p + 10);
    const crc = u32(view, p + 16);
    const compressedSize = u32(view, p + 20);
    const uncompressedSize = u32(view, p + 24);
    const nameLen = u16(view, p + 28);
    const extraLen = u16(view, p + 30);
    const commentLen = u16(view, p + 32);
    const localOffset = u32(view, p + 42);
    if (p + 46 + nameLen + extraLen + commentLen > bytes.length) throw new Error("ZIP_ENTRY_BOUNDS_INVALID");
    const name = decoder.decode(bytes.slice(p + 46, p + 46 + nameLen)).replaceAll("\\", "/");
    if (!safeName(name)) throw new Error(`ZIP_UNSAFE_PATH:${name}`);
    if (uncompressedSize > maxEntry) throw new Error(`ZIP_ENTRY_TOO_LARGE:${name}`);
    total += uncompressedSize;
    if (total > maxTotal) throw new Error("ZIP_UNCOMPRESSED_TOTAL_TOO_LARGE");
    entries.push({ name, compressedSize, uncompressedSize, method, crc32: crc, localOffset, encrypted: Boolean(flags & 1) });
    p += 46 + nameLen + extraLen + commentLen;
  }

  return {
    entries,
    async extract(entry) {
      if (entry.encrypted) throw new Error(`ZIP_ENCRYPTED_ENTRY:${entry.name}`);
      if (![0, 8].includes(entry.method)) throw new Error(`ZIP_UNSUPPORTED_METHOD:${entry.name}`);
      const o = entry.localOffset;
      if (o + 30 > bytes.length || u32(view, o) !== LOC) throw new Error(`ZIP_LOCAL_HEADER_INVALID:${entry.name}`);
      const nameLen = u16(view, o + 26);
      const extraLen = u16(view, o + 28);
      const start = o + 30 + nameLen + extraLen;
      const end = start + entry.compressedSize;
      if (end > bytes.length) throw new Error(`ZIP_COMPRESSED_DATA_INVALID:${entry.name}`);
      const packed = bytes.slice(start, end);
      const out = entry.method === 0 ? packed : await inflateRaw(packed);
      if (out.byteLength !== entry.uncompressedSize) throw new Error(`ZIP_SIZE_MISMATCH:${entry.name}`);
      if (crc32(out) !== entry.crc32) throw new Error(`ZIP_CRC_MISMATCH:${entry.name}`);
      return out;
    },
  };
}
