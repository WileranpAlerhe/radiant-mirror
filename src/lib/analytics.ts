// Google Analytics 4 (gtag.js)
// O ID de medição (G-XXXXXXXXXX) é público. Ele pode vir do conector do
// Lovable ou ser definido diretamente na constante abaixo.
const FALLBACK_MEASUREMENT_ID = "G-3HRFG0N7H9";

export const GA_MEASUREMENT_ID: string =
  (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined) ||
  FALLBACK_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined" || !GA_MEASUREMENT_ID) return;
  initialized = true;

  // A tag já é renderizada no HTML (SSR) pelo __root. Só injeta se, por
  // algum motivo, ela não estiver presente.
  const jaCarregada = document.querySelector(
    'script[src*="googletagmanager.com/gtag/js"]',
  );
  if (!jaCarregada) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
    gtag("js", new Date());
    gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
  }
}

export function trackPageView(path: string) {
  if (!GA_MEASUREMENT_ID) return;
  gtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
    page_title: typeof document !== "undefined" ? document.title : undefined,
  });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!GA_MEASUREMENT_ID) return;
  gtag("event", name, params);
}
