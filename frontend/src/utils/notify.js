/* Imibavu Collection — one shared SweetAlert2 layer for all three portals.
   Every success, warning, error and confirmation looks the same everywhere.

   Rules kept from the spec:
   - toasts for quick success/info, dialogs only when the user must decide
   - toasts sit top-center on phones, top-end on desktop (never over bottom nav)
   - destructive actions always confirm and name what will change
   - inline validation stays inline; pop-ups are never used for field errors
   - icon + text always, so nothing relies on colour alone */
import Swal from "sweetalert2";
import { t, getLang } from "../i18n";

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 640;
const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const theme = () => {
  try { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  catch (e) { return "light"; }
};

/* ---------- backend code → translated message ----------
   The API returns { success:false, code, message } for every failure, so the UI
   can translate the code and fall back to the server message. */
export const CODE_KEYS = {
  STOCK_TOO_LOW: "err_STOCK_TOO_LOW",
  OUT_OF_STOCK: "err_OUT_OF_STOCK",
  PRODUCT_UNAVAILABLE: "err_PRODUCT_UNAVAILABLE",
  INVALID_CREDENTIALS: "err_INVALID_CREDENTIALS",
  ACCOUNT_LOCKED: "err_ACCOUNT_LOCKED",
  ACCOUNT_DISABLED: "err_ACCOUNT_DISABLED",
  MFA_REQUIRED: "err_MFA_REQUIRED",
  MFA_INVALID: "err_MFA_INVALID",
  ROLE_MISMATCH: "err_ROLE_MISMATCH",
  FORBIDDEN: "err_FORBIDDEN",
  UNAUTHORIZED: "err_UNAUTHORIZED",
  SESSION_EXPIRED: "err_SESSION_EXPIRED",
  TOO_MANY_REQUESTS: "err_TOO_MANY_REQUESTS",
  OTP_INVALID: "err_OTP_INVALID",
  OTP_EXPIRED: "err_OTP_EXPIRED",
  VALIDATION_ERROR: "err_VALIDATION_ERROR",
  NOT_FOUND: "err_NOT_FOUND",
  PROMO_INVALID: "err_PROMO_INVALID",
  PAYMENT_FAILED: "err_PAYMENT_FAILED",
  PAYMENT_PENDING: "err_PAYMENT_PENDING",
  NETWORK: "err_NETWORK",
  TIMEOUT: "err_TIMEOUT",
  ERROR: "err_generic",
};

/* Prefer the translation for the code; fall back to the server's own message. */
export function errText(err, fallback) {
  const code = (err && err.code) || "";
  const key = CODE_KEYS[code];
  if (key) {
    const msg = t(key);
    if (msg && msg !== key) return msg;
  }
  return (err && err.message) || fallback || t("err_generic");
}

/* ---------- shared dialog styling ---------- */
function fire(opts) {
  return Swal.fire({
    theme: theme(),
    heightAuto: false,
    ...opts,
  });
}

const Toast = Swal.mixin({
  toast: true,
  position: isMobile() ? "top" : "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  theme: theme(),
  didOpen: (el) => {
    /* Pause while hovered or touched so the message is always readable. */
    el.addEventListener("mouseenter", Swal.stopTimer);
    el.addEventListener("mouseleave", Swal.resumeTimer);
    el.addEventListener("touchstart", Swal.stopTimer, { passive: true });
    el.addEventListener("touchend", Swal.resumeTimer, { passive: true });
  },
});

/* ---------- small helpers ---------- */
export async function copyText(text) {
  const value = String(text || "");
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (e) { /* fall through to the legacy path */ }
  try {
    const el = document.createElement("textarea");
    el.value = value;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch (e) { return false; }
}

/* Default input validators, so no dialog ever submits empty. */
const required = (label) => (v) => (String(v || "").trim() ? undefined : label);

export const notify = {
  /* --- toasts: quick feedback --- */
  success: (title = t("notify_done")) => Toast.fire({ icon: "success", title }),
  info: (title) => Toast.fire({ icon: "info", title }),
  warning: (title) => Toast.fire({ icon: "warning", title }),
  error: (title = t("err_generic")) =>
    Toast.fire({ icon: "error", title, timer: 5000, timerProgressBar: true }),

  /* Show the right toast for a failed API call, using the code map. */
  apiError: (err, fallback) => Toast.fire({ icon: "error", title: errText(err, fallback), timer: 5000 }),

  /* --- confirmation dialog (destructive actions) --- */
  confirm: ({
    title,
    text = "",
    html,
    confirmText = t("confirm"),
    cancelText = t("cancel"),
    icon = "warning",
    danger = false,
  } = {}) =>
    fire({
      title,
      text: html ? undefined : text,
      html,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      focusCancel: true,
      customClass: { confirmButton: danger ? "swal-danger" : undefined },
    }).then((r) => r.isConfirmed),

  /* --- input dialog: a reason is required before we continue --- */
  askReason: ({
    title,
    placeholder = t("reason_ph"),
    confirmText = t("confirm"),
    cancelText = t("cancel"),
    label = t("reason_required"),
  } = {}) =>
    fire({
      title,
      input: "textarea",
      inputPlaceholder: placeholder,
      inputAttributes: { "aria-label": title || t("reason_ph") },
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      inputValidator: required(label),
    }).then((r) => (r.isConfirmed ? String(r.value).trim() : null)),

  /* --- short single-line input (quantity, price, code, phone) --- */
  askText: ({
    title,
    value = "",
    placeholder = "",
    inputType = "text",
    inputMode,
    confirmText = t("confirm"),
    cancelText = t("cancel"),
    label = t("field_required"),
  } = {}) =>
    fire({
      title,
      input: inputType === "number" ? "number" : "text",
      inputValue: value,
      inputPlaceholder: placeholder,
      inputAttributes: inputMode ? { inputmode: inputMode } : undefined,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      inputValidator: required(label),
    }).then((r) => (r.isConfirmed ? String(r.value).trim() : null)),

  /* --- loading dialog for uploads, payments and exports --- */
  loading: (title = t("working")) =>
    fire({
      title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    }),

  close: () => Swal.close(),

  /* --- result dialog: the moment something important completes --- */
  result: ({
    icon = "success",
    title,
    html,
    confirmText = t("continue"),
    cancelText,
  } = {}) =>
    fire({
      icon,
      title,
      html,
      confirmButtonText: confirmText,
      showCancelButton: !!cancelText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    }).then((r) => (r.isConfirmed ? true : false)),

  /* --- warning with a visible countdown (session, unsaved work, low stock) --- */
  countdown: ({
    title,
    html,
    seconds = 60,
    confirmText = t("stay_signed_in"),
    cancelText = t("logout"),
    icon = "warning",
  } = {}) =>
    fire({
      icon,
      title,
      html,
      timer: seconds * 1000,
      timerProgressBar: true,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
      didOpen: () => {
        const el = Swal.getHtmlContainer();
        if (!el) return;
        const tick = () => {
          const left = Math.max(0, Math.round(Swal.getTimerLeft() / 1000));
          const node = el.querySelector("[data-countdown]");
          if (node) node.textContent = String(left);
        };
        tick();
        const id = setInterval(tick, 500);
        Swal.getPopup().addEventListener("swal:close", () => clearInterval(id));
      },
    }).then((r) => (r.isConfirmed ? "stay" : "leave")),

  /* --- onboarding tour helper: a few steps in one dialog --- */
  tour: (steps, done = t("got_it")) => {
    let i = 0;
    const show = () =>
      fire({
        title: steps[i].title,
        html: steps[i].text,
        confirmButtonText: i === steps.length - 1 ? done : t("next"),
        showCancelButton: i > 0,
        cancelButtonText: t("back"),
        reverseButtons: true,
        allowOutsideClick: false,
      }).then((r) => {
        if (r.isConfirmed) {
          if (i === steps.length - 1) return true;
          i += 1;
          return show();
        }
        if (i > 0) { i -= 1; return show(); }
        return false;
      });
    return show();
  },

  isMobile,
  reduceMotion,
  lang: getLang,
};

export default notify;
