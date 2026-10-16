/**
 * Meta (Facebook / Instagram) Pixel. Set VITE_META_PIXEL_ID on the hosting
 * side (Netlify → Environment variables, scope "Builds") and redeploy; with no
 * id every call here is a no-op.
 */
const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() ?? "";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let started = false;

export function initPixel() {
  if (started || !PIXEL_ID || typeof window === "undefined") return;
  started = true;
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  window.fbq("init", PIXEL_ID);
  window.fbq("track", "PageView");
}

export function track(event: string, params?: Record<string, unknown>) {
  if (!PIXEL_ID || typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}
