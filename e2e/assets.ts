import { deflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const SIZE = 4;
const pixels = (rgb: [number, number, number]) => {
  const row = [0, ...Array.from({ length: SIZE }, () => [...rgb, 255]).flat()];
  return deflateSync(Buffer.from(Array.from({ length: SIZE }, () => row).flat()));
};

function header() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr)];
}

/** A tiny solid-color PNG. */
export function png(rgb: [number, number, number] = [200, 200, 200]) {
  return Buffer.concat([...header(), chunk("IDAT", pixels(rgb)), chunk("IEND", new Uint8Array())]);
}

/** An APNG with one frame per delay (ms), so its length is known exactly. */
export function apng(delaysMs: number[]) {
  const parts = header();
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(delaysMs.length, 0);
  parts.push(chunk("acTL", actl));
  let seq = 0;
  delaysMs.forEach((ms, i) => {
    const fctl = Buffer.alloc(26);
    fctl.writeUInt32BE(seq++, 0);
    fctl.writeUInt32BE(SIZE, 4);
    fctl.writeUInt32BE(SIZE, 8);
    fctl.writeUInt16BE(ms, 20);
    fctl.writeUInt16BE(1000, 22);
    parts.push(chunk("fcTL", fctl));
    const data = pixels([i * 40, 100, 200]);
    if (i === 0) parts.push(chunk("IDAT", data));
    else {
      const seqBuf = Buffer.alloc(4);
      seqBuf.writeUInt32BE(seq++, 0);
      parts.push(chunk("fdAT", Buffer.concat([seqBuf, data])));
    }
  });
  parts.push(chunk("IEND", new Uint8Array()));
  return Buffer.concat(parts);
}

/** A short sine tone as 16-bit mono WAV (browsers decode it whatever the extension says). */
export function wav(ms: number, hz = 880) {
  const rate = 22050;
  const samples = Math.round((rate * ms) / 1000);
  const out = Buffer.alloc(44 + samples * 2);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + samples * 2, 4);
  out.write("WAVEfmt ", 8, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24);
  out.writeUInt32LE(rate * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) out.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * 8000), 44 + i * 2);
  return out;
}
