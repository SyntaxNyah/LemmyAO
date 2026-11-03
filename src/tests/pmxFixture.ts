// Builds minimal, structurally valid PMX 2.0 buffers for the texture-table
// parser tests. The parser only walks header + vertices + faces + textures, so
// the fixture stops right after the texture table.

export interface PmxFixtureOptions {
  /** PMX text encoding flag: 0 = UTF-16LE, 1 = UTF-8. */
  encoding?: 0 | 1;
  /** Width of a vertex index (globals 3). */
  vertexIndexSize?: 1 | 2 | 4;
  /** Width of a bone index (globals 6), used by every weight block. */
  boneIndexSize?: 1 | 2 | 4;
  /** 0 BDEF1, 1 BDEF2, 2 BDEF4, 3 SDEF, 4 QDEF. */
  weightType?: 0 | 1 | 2 | 3 | 4;
  extraUvCount?: number;
  /** 8 for every PMX in the wild; tolerate an unknown extra global. */
  globalsCount?: 8 | 9;
}

function int32(value: number): number[] {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setInt32(0, value, true);
  return [...new Uint8Array(buffer)];
}

function float32(value: number): number[] {
  const buffer = new ArrayBuffer(4);
  new DataView(buffer).setFloat32(0, value, true);
  return [...new Uint8Array(buffer)];
}

function utf16le(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes.push(code & 0xff, code >> 8);
  }
  return bytes;
}

/** Byte width of a vertex's weight block, excluding the type byte. */
function weightBlockSize(type: number, boneIndexSize: number): number {
  if (type === 0) return boneIndexSize; // BDEF1
  if (type === 1) return boneIndexSize * 2 + 4; // BDEF2
  if (type === 2) return boneIndexSize * 4 + 16; // BDEF4
  if (type === 3) return boneIndexSize * 2 + 40; // SDEF: 2 bones + weight + C/R0/R1
  return boneIndexSize * 4 + 16; // QDEF
}

export function buildPmx(
  textures: string[],
  options: PmxFixtureOptions = {},
): Uint8Array<ArrayBuffer> {
  const {
    encoding = 1,
    vertexIndexSize = 2,
    boneIndexSize = 2,
    weightType = 1,
    extraUvCount = 0,
    globalsCount = 8,
  } = options;

  const bytes: number[] = [];
  const push = (...values: number[]): void => {
    bytes.push(...values);
  };
  const pushText = (text: string): void => {
    const encoded = encoding === 0 ? utf16le(text) : [...new TextEncoder().encode(text)];
    push(...int32(encoded.length), ...encoded);
  };

  push(...[...("PMX ")].map((char) => char.charCodeAt(0)));
  push(...float32(2.0));
  push(globalsCount);
  push(encoding, extraUvCount, vertexIndexSize, 1, 1, boneIndexSize, 2, 2);
  if (globalsCount > 8) push(0); // extra 2.1 global

  pushText("Fixture model");
  pushText("");
  pushText("");
  pushText("");

  push(...int32(1)); // one vertex
  push(...new Array(32 + extraUvCount * 16).fill(0)); // position + normal + UV [+ extras]
  push(weightType);
  push(...new Array(weightBlockSize(weightType, boneIndexSize)).fill(0));
  push(...new Array(4).fill(0)); // edge scale

  push(...int32(3)); // one triangle
  push(...new Array(3 * vertexIndexSize).fill(0));

  push(...int32(textures.length));
  for (const texture of textures) pushText(texture);

  return new Uint8Array(bytes);
}
