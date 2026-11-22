import { settings, setSetting } from "../../core/settings";
import { loadLayout, type PanelLayout } from "./panelLayout";
import { LAYOUT_FORMAT, LAYOUT_VERSION, layoutFileFor, parseLayoutFile, type LayoutFile } from "./layoutFile";

/**
 * Layouts are also kept in a first-party cookie, because localStorage is keyed
 * by scheme: https://host and http://host are different origins, while a
 * host-only cookie is shared by both. It only holds tab ids, split sizes, the
 * active tabs and the portrait viewport height — no chat or identity data.
 *
 * The cookie is scoped to the client page's path, so assets don't carry it.
 */
export const LAYOUT_COOKIE = "lemmyao_layout";
/** When the newest layout was written; localStorage is per scheme, the cookie is shared. */
export const LAYOUT_TIME_KEY = "panelLayoutUpdatedAt";

/** Keep room for the name and attributes in the usual 4 KiB cookie budget. */
const MAX_COOKIE_VALUE = 3800;
const COOKIE_AGE = 60 * 60 * 24 * 365;

const cookiePath = () => (typeof location === "undefined" ? "/" : location.pathname || "/");

const encode = (value: unknown): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const decode = (value: string): unknown => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
};

function writeCookie(value: string, age = COOKIE_AGE) {
  try {
    document.cookie = `${LAYOUT_COOKIE}=${value}; Path=${cookiePath()}; Max-Age=${age}; SameSite=Lax`;
  } catch {
    /* storage still works; it just won't cross schemes */
  }
}

const dropCookie = () => writeCookie("", 0);

function cookieValue(): string | null {
  try {
    const prefix = `${LAYOUT_COOKIE}=`;
    const part = document.cookie.split("; ").find((cookie) => cookie.startsWith(prefix));
    return part?.slice(prefix.length) ?? null;
  } catch {
    return null;
  }
}

function readTime(): number {
  try {
    const value = Number(localStorage.getItem(LAYOUT_TIME_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeTime(at: number) {
  try {
    localStorage.setItem(LAYOUT_TIME_KEY, String(at));
  } catch {
    /* the cookie still carries the layout */
  }
}

type Shared =
  | { kind: "layout"; file: LayoutFile; at: number }
  | { kind: "reset"; at: number };

function readShared(): Shared | null {
  const raw = cookieValue();
  if (!raw) return null;
  try {
    const value = decode(raw);
    if (typeof value !== "object" || value === null) return null;
    const data = value as Record<string, unknown>;
    const at = Number(data.at);
    if (!Number.isFinite(at)) return null;
    if (data.reset === true) return { kind: "reset", at };
    return { kind: "layout", file: parseLayoutFile(JSON.stringify(data)), at };
  } catch {
    return null;
  }
}

/** Writes the layout to the cookie shared by this host's http and https pages. */
export function mirrorLayout(layout: PanelLayout, portrait: number) {
  const at = Date.now();
  writeTime(at);
  const value = encode({ ...layoutFileFor(layout, portrait), at });
  if (value.length > MAX_COOKIE_VALUE) {
    // A layout this big can't fit; localStorage still has it, and export/import works.
    dropCookie();
    return;
  }
  writeCookie(value);
}

/** Marks the layout as cleared, so the other scheme clears its copy on its next load. */
export function clearSharedLayout() {
  const at = Date.now();
  writeTime(at);
  writeCookie(encode({ format: LAYOUT_FORMAT, version: LAYOUT_VERSION, reset: true, at }));
}

/**
 * Reconciles this scheme's saved layout with the cookie, newest wins. Runs at
 * startup and when the client regains focus, so an edit made over http shows
 * up over https on the same host (and the other way around).
 */
export function syncSharedLayout() {
  const shared = readShared();
  const localAt = readTime();
  const localCustom = settings.panelLayout !== "" || settings.layoutViewportPortrait !== 0;

  if (shared?.kind === "reset") {
    if (shared.at > localAt) {
      setSetting("panelLayout", "");
      setSetting("layoutViewportPortrait", 0);
      setSetting("tabOrder", []);
      writeTime(shared.at);
    }
    return;
  }

  // A custom layout only loses to a strictly newer shared one; when this scheme
  // has no custom layout, the shared copy also wins a same-millisecond tie.
  if (shared && (localCustom ? shared.at > localAt : shared.at >= localAt)) {
    setSetting("panelLayout", JSON.stringify(shared.file.panelLayout));
    setSetting("layoutViewportPortrait", shared.file.layoutViewportPortrait);
    writeTime(shared.at);
    return;
  }

  if (localCustom) {
    mirrorLayout(loadLayout(settings.panelLayout, settings.tabOrder), settings.layoutViewportPortrait);
    return;
  }

  // This scheme was reset after the cookie was written; tombstone the stale copy.
  if (shared && localAt > shared.at) clearSharedLayout();
}
