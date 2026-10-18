/**
 * Attribution — remembers WHERE a visitor came from and WHICH browser they are,
 * so page views and WhatsApp taps can be tied back to a channel.
 *
 * - `ref`: a short tag on the link the visitor opened, e.g.
 *     https://zango-connect.vercel.app/store/amina-fabrics?ref=wa-status
 *   Kept for the browser tab's session, so it still applies when the visitor
 *   clicks through from the store page to a product and taps WhatsApp.
 *   Also reads `utm_source` as a fallback.
 * - `visitor_id`: anonymous random id stored in the browser. It counts
 *   browsers/devices, not people, and holds no personal data.
 *
 * Everything here is best-effort: storage can be blocked (private mode, some
 * in-app browsers), so each read/write falls back to memory and never throws.
 */

const REF_KEY = "zango:ref";
const VISITOR_KEY = "zango:vid";
const REF_PATTERN = /^[a-z0-9_-]{1,40}$/;
const VISITOR_PATTERN = /^[a-z0-9-]{8,64}$/i;

const memory = new Map<string, string>();

function storageFor(kind: "local" | "session"): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function safeGet(kind: "local" | "session", key: string): string | null {
  try {
    const fromStorage = storageFor(kind)?.getItem(key);
    if (fromStorage) return fromStorage;
  } catch {
    // fall through to memory
  }
  return memory.get(key) ?? null;
}

function safeSet(kind: "local" | "session", key: string, value: string) {
  memory.set(key, value);
  try {
    storageFor(kind)?.setItem(key, value);
  } catch {
    // memory copy is enough for this page load
  }
}

/** Turns any raw tag into a safe `a-z 0-9 _ -` tag (max 40 chars), or null. */
export function normaliseRef(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 40)
    .replace(/^-+|-+$/g, "");
  return REF_PATTERN.test(cleaned) ? cleaned : null;
}

/** Reads ?ref= (or ?utm_source=) from the current URL and remembers it. */
export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming = normaliseRef(params.get("ref") ?? params.get("utm_source"));
    if (incoming) safeSet("session", REF_KEY, incoming);
  } catch {
    // never block the app over attribution
  }
}

/** The channel tag for this visit, or null for direct/unknown traffic. */
export function getRef(): string | null {
  // Re-check the URL every time so we still catch a ref if the entry point
  // didn't run captureAttribution() for any reason.
  captureAttribution();
  const stored = safeGet("session", REF_KEY);
  return stored && REF_PATTERN.test(stored) ? stored : null;
}

function makeId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  const rand = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, "0");
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`;
}

/** Anonymous per-browser id. Null on the server. */
export function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  let id = safeGet("local", VISITOR_KEY);
  if (!id || !VISITOR_PATTERN.test(id)) {
    id = makeId();
    safeSet("local", VISITOR_KEY, id);
  }
  return id;
}

/** The two fields attached to every tracked view and WhatsApp tap. */
export function attributionFields(): { ref: string | null; visitor_id: string | null } {
  return { ref: getRef(), visitor_id: getVisitorId() };
}
