// Divergence meter: a small canvas widget for the TimeLeap overlay. The meter is
// presentation only — nothing reads its value back.
//
// The visual style is Steins;Gate's nixie tube, but no VN art ships here: the
// fallback below draws the glyphs with the platform font, so the repo stays
// licence-clean. A server operator may point MeterOpts.sheetUrl at an 11-cell
// strip (0-9 then '.') to get authentic tubes without the client bundling them.

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let sheet: HTMLImageElement | null = null;
let current = "1.048596";
let raf = 0;

export interface MeterOpts {
  /** Sprite sheet laid out as 11 columns x 1 row: 0-9 then '.'. */
  sheetUrl?: string;
  /** Rendered height in CSS px. */
  height?: number;
}

// Geometry reference: the nixie tube is drawn at 132x428 (large), 66x214
// (medium) or 33x107 (small) in the VN; any operator sheet should be normalised
// to that aspect ratio.
const TUBE_ASPECT = 132 / 428;

export function initDivergenceMeter(
  host: HTMLElement,
  opts: MeterOpts = {},
): void {
  canvas = document.createElement("canvas");
  canvas.className = "tl-meter";
  canvas.style.cssText = `height:${opts.height ?? 48}px;image-rendering:pixelated;display:block`;
  host.appendChild(canvas);
  ctx = canvas.getContext("2d");
  if (opts.sheetUrl) {
    const img = new Image();
    img.onload = () => {
      sheet = img;
      draw(current);
    };
    img.src = opts.sheetUrl; // never bundled; supplied by the operator
  }
  draw(current);
}

export function teardownDivergenceMeter(): void {
  cancelAnimationFrame(raf);
  canvas?.remove();
  canvas = null;
  ctx = null;
  sheet = null;
}

function draw(text: string): void {
  if (!ctx || !canvas) return;
  const h = canvas.clientHeight || 48;
  const cellW = Math.round(h * TUBE_ASPECT);
  canvas.width = cellW * Math.max(1, text.length);
  canvas.height = h;
  ctx.clearRect(0, 0, canvas.width, h);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const x = i * cellW;
    if (sheet) {
      const idx = ch === "." ? 10 : Number(ch);
      const sw = sheet.width / 11;
      const sh = sheet.height;
      ctx.drawImage(
        sheet,
        (Number.isFinite(idx) ? idx : 10) * sw,
        0,
        sw,
        sh,
        x,
        0,
        cellW,
        h,
      );
    } else {
      ctx.font = `${Math.round(h * 0.8)}px "Courier New", monospace`;
      ctx.fillStyle = "#ff9d3a";
      ctx.shadowColor = "#ff6a00";
      ctx.shadowBlur = h * 0.25;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, x + cellW / 2, h / 2);
      ctx.shadowBlur = 0;
    }
  }
}

/**
 * The "worldline shift": every digit cycles 0-9 with a decaying rate and settles
 * left to right. Time-based, so a throttled background tab resolves instantly on
 * return instead of resuming mid-roll.
 */
export function animateDivergence(target: string, ms = 1400): void {
  cancelAnimationFrame(raf);
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    let out = "";
    for (let i = 0; i < target.length; i++) {
      const settle = (i + 1) / (target.length + 1);
      const ch = target[i];
      if (!/[0-9]/.test(ch) || t >= settle) {
        out += ch;
        continue;
      }
      const phase = Math.floor((now - start) / (30 + 90 * (t / settle)));
      out += String((phase + i) % 10);
    }
    draw(out);
    if (t < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      current = target;
      draw(target);
    }
  };
  raf = requestAnimationFrame(tick);
}
