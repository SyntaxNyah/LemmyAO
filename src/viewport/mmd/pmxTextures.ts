// Minimal PMX 2.0/2.1 texture-table reader.
//
// 3D packs are sometimes re-encoded on the asset host (PNG -> WebP) without the
// model's texture table being rewritten, so the names a PMX declares are not
// necessarily the names the server still serves. This walks just enough of the
// binary (header, vertices, faces) to reach that table; what to do about a
// mismatch is the caller's job (see textureOverrides.ts).

const PMX_MAGIC = "PMX ";

/** Returns the texture paths a PMX declares, or null if it can't be read. */
export function parsePmxTexturePaths(buffer: ArrayBufferLike): string[] | null {
  try {
    // Header: magic(4) + version(4) + globals count(1) + globals(N).
    if (buffer.byteLength < 17) return null;
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== PMX_MAGIC) return null;

    const globalsCount = view.getUint8(8); // 8 encoding/index-width globals in PMX 2.0 and 2.1
    const globalsStart = 9;
    if (globalsCount < 8 || globalsStart + globalsCount > buffer.byteLength) return null;

    const encoding = view.getUint8(globalsStart); // 0 = UTF-16LE, 1 = UTF-8
    const extraUvCount = view.getUint8(globalsStart + 1);
    const vertexIndexSize = view.getUint8(globalsStart + 2);
    const boneIndexSize = view.getUint8(globalsStart + 5);

    let offset = globalsStart + globalsCount;

    const ensure = (size: number): void => {
      if (size < 0 || offset + size > buffer.byteLength) throw new RangeError("Truncated PMX");
    };
    const readInt32 = (): number => {
      ensure(4);
      const value = view.getInt32(offset, true);
      offset += 4;
      return value;
    };
    const readUint32 = (): number => {
      ensure(4);
      const value = view.getUint32(offset, true);
      offset += 4;
      return value;
    };
    const decoder = new TextDecoder(encoding === 0 ? "utf-16le" : "utf-8");
    const readText = (): string => {
      const byteLength = readInt32(); // PMX strings are length-prefixed, in bytes
      ensure(byteLength);
      const text = decoder.decode(bytes.subarray(offset, offset + byteLength));
      offset += byteLength;
      return text;
    };

    // Model info: name, English name, comment, English comment.
    readText();
    readText();
    readText();
    readText();

    // Vertices: 32 fixed bytes (position, normal, UV) + extra UVs, then a
    // weight block whose width depends on the weight type and the *bone* index
    // width (independent of the vertex index width in a PMX).
    const vertexCount = readUint32();
    for (let i = 0; i < vertexCount; i++) {
      offset += 32 + extraUvCount * 16;
      ensure(1);
      const weightType = view.getUint8(offset);
      offset += 1;
      if (weightType === 0) offset += boneIndexSize; // BDEF1
      else if (weightType === 1) offset += boneIndexSize * 2 + 4; // BDEF2
      else if (weightType === 2) offset += boneIndexSize * 4 + 16; // BDEF4
      else if (weightType === 3) offset += boneIndexSize * 2 + 40; // SDEF: 2 bones + weight + C/R0/R1
      else offset += boneIndexSize * 4 + 16; // QDEF (same width as BDEF4)
      offset += 4; // edge scale
    }

    // Faces: one flat list of vertex indices.
    const indexCount = readUint32();
    offset += indexCount * vertexIndexSize;
    ensure(0);

    // Texture table: a count, then one length-prefixed path per entry.
    const textureCount = readUint32();
    const paths: string[] = [];
    for (let i = 0; i < textureCount; i++) paths.push(readText());
    return paths;
  } catch {
    return null;
  }
}
