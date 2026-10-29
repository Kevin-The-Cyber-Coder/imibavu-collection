/* Imibavu Collection — light / dark theme.
   Follows the device setting until the person picks a side manually. */
const KEY = "imibavu_theme";

export function prefersDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function getTheme() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch (e) { /* private mode */ }
  return prefersDark() ? "dark" : "light";
}

/* true when the visitor has not overridden the device setting */
export function isFollowingDevice() {
  try { return !localStorage.getItem(KEY); } catch (e) { return true; }
}

export function setTheme(v) {
  const next = v === "dark" ? "dark" : "light";
  try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
  apply(next);
  return next;
}

/* null / "device" clears the override and re-follows the device */
export function clearTheme() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  const next = prefersDark() ? "dark" : "light";
  apply(next);
  return next;
}

function apply(v) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", v === "dark" ? "#141210" : "#faf7f2");
}

export function initTheme() {
  apply(getTheme());
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if (isFollowingDevice()) apply(getTheme()); };
  if (mq.addEventListener) mq.addEventListener("change", onChange);
  else if (mq.addListener) mq.addListener(onChange);
}
