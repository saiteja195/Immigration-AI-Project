export type Scheme = "system" | "light" | "dark";
const KEY = "color-scheme";

export function getScheme(): Scheme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

/** Updates the <meta name="color-scheme">; CSS maps it to the color-scheme property. */
export function setScheme(scheme: Scheme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = scheme === "system" ? "light dark" : scheme;
  try {
    if (scheme === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, scheme);
  } catch {
    /* storage blocked: scheme still applies for this visit */
  }
}
