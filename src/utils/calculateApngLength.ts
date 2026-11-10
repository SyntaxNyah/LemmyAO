/**
 * Adds up the frame delays (fcTL chunks) to find out how long an APNG is, in ms.
 * https://wiki.mozilla.org/APNG_Specification#.60fcTL.60:_The_Frame_Control_Chunk
 */
const FCTL = 0x6663544c;

const calculateApngLength = (apngFile: ArrayBuffer): number => {
  const view = new DataView(apngFile);
  let duration = 0;
  // Chunks follow the 8-byte PNG signature: length, type, data, CRC.
  for (let offset = 8; offset + 8 <= view.byteLength; offset += 12 + view.getUint32(offset)) {
    if (view.getUint32(offset + 4) !== FCTL || offset + 8 + 26 > view.byteLength) continue;
    const delayNum = view.getUint16(offset + 8 + 20);
    // A zero denominator means hundredths of a second.
    const delayDen = view.getUint16(offset + 8 + 22) || 100;
    duration += (delayNum / delayDen) * 1000;
  }
  return duration;
};
export default calculateApngLength;
