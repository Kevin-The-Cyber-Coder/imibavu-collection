import { useEffect, useRef, useState } from "react";
import {
  useStore, state, go, login, register, verify, resetPassword, otpResend, forgotPassword,
  authMode, setLoginRole, changePendingPassword, startMfaSetup, verifyMfa, unlockSend, unlockVerify, googleLogin, setLang,
} from "../store";
import { t } from "../i18n";
import { notify } from "../utils/notify";
import { getTheme, setTheme } from "../utils/theme";
import { FiGlobe, FiSun, FiMoon, FiKey } from "../components/Icons";

const GOOGLE_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

/* Card + brand panel: on desktop the form sits centred beside a brand image
   panel; on phones the card fills the screen with comfortable spacing. */
function AuthShell({ children }) {
  const [theme, setThemeState] = useState(() => getTheme());
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  };
  return (
    <div className="login-shell">
      <aside className="login-aside" aria-hidden="true">
        <div className="la-inner">
          <span className="la-mark">I</span>
          <h2>Imibavu Collection</h2>
          <p>Minimalist perfumes, concentrated oils and custom blends — mixed in store in downtown Kigali.</p>
          <ul className="la-points">
            <li>Track every order from placed to delivered</li>
            <li>Save your blends and reorder in one tap</li>
            <li>Earn loyalty points on every purchase</li>
          </ul>
        </div>
      </aside>

      <div className="login-card-wrap">
        <div className="login-corner">
          <label className="lang-switch" aria-label={t("language")}>
            <FiGlobe aria-hidden="true" />
            <select value={state.lang} onChange={e => setLang(e.target.value)} aria-label={t("language")}>
              <option value="en">EN</option>
              <option value="rw">RW</option>
              <option value="fr">FR</option>
            </select>
          </label>
          <button type="button" className="icon-btn" onClick={toggleTheme}
            aria-label={theme === "dark" ? t("light_mode") : t("dark_mode")}>
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function portalHash(role) {
  if (role === "admin") return "#/admin";
  if (role === "staff") return "#/staff";
  return "#/account";
}

function RoleSelect({ value, onChange }) {
  const roles = [
    ["customer", t("log_role_customer"), t("log_role_customer_sub"), "🛍️"],
    ["staff", t("log_role_staff"), t("log_role_staff_sub"), "🧑‍💼"],
    ["admin", t("log_role_admin"), t("log_role_admin_sub"), "🛡️"],
  ];
  return (
    <div className="role-grid" role="radiogroup" aria-label={t("log_role_title")}>
      {roles.map(([id, label, sub, icon]) => (
        <button
          type="button"
          key={id}
          role="radio"
          aria-checked={value === id}
          className={`role-card ${value === id ? "on" : ""}`}
          onClick={() => onChange(id)}
        >
          <span className="role-ico" aria-hidden="true">{icon}</span>
          <b>{label}</b>
          <small>{sub}</small>
        </button>
      ))}
    </div>
  );
}

function OtpInput({ value, onChange, length = 6, autoFocus, disabled }) {
  const refs = useRef([]);
  const digits = String(value || "").split("");
  useEffect(() => { if (autoFocus && refs.current[0]) refs.current[0].focus(); }, [autoFocus]);

  const handle = (i, e) => {
    const v = e.target.value.replace(/\D/g, "");
    const next = String(value || "").split("");
    if (!v) { next[i] = ""; onChange(next.join("")); return; }
    if (v.length > 1) {
      const joined = (String(value || "").slice(0, i) + v).slice(0, length);
      onChange(joined);
      const idx = Math.min(i + v.length, length - 1);
      if (refs.current[idx]) refs.current[idx].focus();
      return;
    }
    next[i] = v;
    onChange(next.join("").slice(0, length));
    if (i < length - 1 && refs.current[i + 1]) refs.current[i + 1].focus();
  };

  const keydown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0 && refs.current[i - 1]) refs.current[i - 1].focus();
  };

  const paste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (text) {
      onChange(text);
      const idx = Math.min(text.length, length - 1);
      if (refs.current[idx]) refs.current[idx].focus();
    }
  };

  return (
    <div className="otp-row" onPaste={paste}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          className="otp-box"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digits[i] || ""}
          disabled={disabled}
          onChange={e => handle(i, e)}
          onKeyDown={e => keydown(i, e)}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

function QrCode({ text }) {
  const ref = useRef(null);
  useEffect(() => {
    let cancelled = false;
    if (!text || !ref.current) return;
    import("qrcode")
      .then(QR => QR.toCanvas(ref.current, text, {
        width: 168, margin: 1, color: { dark: "#12100e", light: "#ffffff" },
      }))
      .catch(() => {});
    return () => { cancelled = true; };
  }, [text]);
  return <canvas ref={ref} className="qr-canvas" aria-label="Authenticator QR code" />;
}

export default function Login({ mode = "login" }) {
  useStore();
  const m = state.acc.authMode;
  const role = state.acc.loginRole;
  const pending = state.acc.pending;
  const setup = state.acc.mfaSetup;

  const [f, setF] = useState({ id: "", password: "", name: "", phone: "", email: "", np: "", cp: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [locked, setLocked] = useState(false);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  /* Resend countdown: one code per 30 seconds, so nobody hammers the SMS API. */
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  /* Biometric / passkey sign-in where the device supports it. */
  const passkeyAvailable =
    typeof window !== "undefined" &&
    !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.get && window.isSecureContext);

  const passkey = async () => {
    try {
      await navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), rpId: window.location.hostname, userVerification: "preferred" } });
      notify.info("Passkeys are not configured on this store yet — use your password.");
    } catch (e) {
      notify.warning("Biometric sign-in was cancelled or is not set up on this device.");
    }
  };

  useEffect(() => { if (state.user) go(portalHash(state.user.role)); }, [state.user && state.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!state.user && mode && mode !== state.acc.authMode) authMode(mode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pending && pending.step === "mfa-setup" && !state.acc.mfaSetup) {
      startMfaSetup().catch(e => setErr(e.message || "Could not start MFA setup"));
    }
  }, [pending && pending.step, state.acc.mfaSetup]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = fn => {
    if (busy) return;
    setErr(""); setLocked(false); setBusy(true);
    Promise.resolve().then(fn)
      .catch(e => {
        const msg = (e && e.message) ? e.message : "Something went wrong — try again";
        setErr(msg);
        if (e && e.code === "TOO_MANY_REQUESTS") setLocked(true);
      })
      .finally(() => setBusy(false));
  };

  const submit = (e) => {
    e.preventDefault();
    if (m === "login") run(() => login(f));
    else if (m === "register") run(() => register(f));
    else if (m === "verify") run(() => verify(code));
    else if (m === "reset") run(() => resetPassword({ phone: f.phone, code, password: f.password }));
  };

  const copySecret = () => {
    const secret = setup && setup.secret;
    if (!secret) return;
    try {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { /* ignore */ }
  };

  const google = () => {
    const onToken = (idToken) => {
      if (!idToken) { setErr("Google sign-in was cancelled"); return; }
      run(() => googleLogin(idToken));
    };
    const start = () => window.google.accounts.id.initialize({ client_id: GOOGLE_ID, callback: r => onToken(r.credential) }) || window.google.accounts.id.prompt();
    if (window.google && window.google.accounts) return start();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = start;
    s.onerror = () => setErr("Could not load Google sign-in");
    document.head.appendChild(s);
  };

  const devHint = state.acc.devCode
    ? <p className="auth-dev">{t("log_dev_hint")} <b>{state.acc.devCode}</b></p>
    : null;

  const alert = err ? <div className="auth-alert err" role="alert">{err}</div> : null;

  /* Already signed in — the redirect effect is firing. */
  if (state.user) {
    return (
      <AuthShell>
        <div className="login-card">
          <h1>{t("log_signin")} ✓</h1>
          <p className="muted">Opening your {t("portal_" + state.user.role)}…</p>
          <a className="btn full" href={portalHash(state.user.role)}>{t("continue")}</a>
        </div>
      </AuthShell>
    );
  }

  /* ---- First-login wizard: forced password change + MFA setup / challenge ---- */
  if (pending) {
    const step = pending.step;
    return (
      <AuthShell>
        <div className="login-card">
          <div className="login-brand"><span className="login-mark">I</span><b>Imibavu Collection</b></div>
          {step === "password" && (
            <form onSubmit={e => {
              e.preventDefault();
              if (f.np !== f.cp) { setErr(t("log_pw_mismatch")); return; }
              run(() => changePendingPassword(f.np));
            }}>
              <h1>{t("log_force_title")}</h1>
              <p className="muted">{t("log_force_sub")}</p>
              <div className="field"><label>{t("log_new_password")}</label>
                <input type="password" autoComplete="new-password" minLength={8} value={f.np} onChange={e => setF({ ...f, np: e.target.value })} required />
                <small className="muted">{t("log_pw_hint")}</small></div>
              <div className="field" style={{ marginTop: 12 }}><label>{t("log_confirm_password")}</label>
                <input type="password" autoComplete="new-password" minLength={8} value={f.cp} onChange={e => setF({ ...f, cp: e.target.value })} required /></div>
              {alert}
              <button className="btn full" style={{ marginTop: 16 }} type="submit" disabled={busy}>{busy ? t("log_working") : t("log_continue")}</button>
            </form>
          )}
          {(step === "mfa-setup" || step === "mfa-login") && (
            <form onSubmit={e => { e.preventDefault(); run(() => verifyMfa(code)); }}>
              <h1>{step === "mfa-setup" ? t("log_mfa_setup_title") : t("log_mfa_title")}</h1>
              <p className="muted">{step === "mfa-setup" ? t("log_mfa_setup_sub") : t("log_mfa_sub")}</p>
              {step === "mfa-setup" && (
                setup ? (
                  <div className="mfa-setup">
                    <QrCode text={setup.otpauth} />
                    <div className="mfa-secret">
                      <span className="muted">{t("log_mfa_manual")}</span>
                      <code>{setup.secret}</code>
                      <button type="button" className="mini-btn" onClick={copySecret}>{copied ? t("log_mfa_copied") : t("log_mfa_copy")}</button>
                    </div>
                  </div>
                ) : <p className="muted">{t("log_working")}</p>
              )}
              <OtpInput value={code} onChange={setCode} autoFocus disabled={busy} />
              {step === "mfa-login" && devHint}
              {alert}
              <button className="btn full" style={{ marginTop: 16 }} type="submit" disabled={busy || code.length < 6}>{busy ? t("log_working") : t("log_mfa_verify")}</button>
              <p className="form-note" style={{ marginTop: 12 }}>
                <button type="button" className="link" onClick={() => { setCode(""); authMode("login"); }}>{t("log_back_signin")}</button>
              </p>
            </form>
          )}
        </div>
      </AuthShell>
    );
  }

  /* ---- Account unlock (after lockout) ---- */
  if (m === "unlock") {
    return (
      <AuthShell>
        <div className="login-card">
          <div className="login-brand"><span className="login-mark">I</span><b>Imibavu Collection</b></div>
          <h1>{t("log_unlock_title")}</h1>
          <p className="muted">{t("log_unlock_sub")}</p>
          <div className="field"><label>{t("phone_num")}</label>
            <input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+250 784 804 739" /></div>
          {!state.acc.unlockSent && (
            <button className="btn ghost full" style={{ marginTop: 12 }} type="button" disabled={busy}
              onClick={() => run(() => unlockSend(f.phone))}>{t("log_send_code")}</button>
          )}
          {state.acc.unlockSent && (
            <>
              <p className="muted" style={{ marginTop: 12 }}>{t("log_enter_code")}</p>
              <OtpInput value={code} onChange={setCode} autoFocus disabled={busy} />
              {devHint}
              <button className="btn full" style={{ marginTop: 16 }} type="button" disabled={busy || code.length < 6}
                onClick={() => run(() => unlockVerify(code).then(() => { setCode(""); authMode("login"); }))}>
                {busy ? t("log_working") : t("log_unlock_btn")}
              </button>
            </>
          )}
          {alert}
          <p className="form-note" style={{ marginTop: 12 }}>
            <button type="button" className="link" onClick={() => authMode("login")}>{t("log_back_signin")}</button>
          </p>
        </div>
      </AuthShell>
    );
  }

  /* ---- Sign in / register / verify / reset ---- */
  return (
    <AuthShell>
      <div className="login-card">
        <div className="login-brand"><span className="login-mark">I</span><b>Imibavu Collection</b></div>

        <form onSubmit={submit}>
          {m === "login" && (
            <>
              <h1>{t("login_title")}</h1>
              <p className="muted">{t("log_role_title")}</p>
              <RoleSelect value={role} onChange={r => { setErr(""); setLoginRole(r); }} />

              <div className="field" style={{ marginTop: 16 }}><label>{t("log_identifier")}</label>
                <input name="id" autoFocus autoComplete="username" inputMode="email"
                  placeholder="+250 784 804 739" value={f.id} onChange={e => setF({ ...f, id: e.target.value })} required /></div>
              <div className="field" style={{ marginTop: 12 }}><label>{t("log_password")}</label>
                <div className="pw-wrap">
                  <input name="password" type={show ? "text" : "password"} autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required />
                  <button type="button" className="pw-toggle" onClick={() => setShow(s => !s)} aria-label={show ? t("log_hide") : t("log_show")}>{show ? t("log_hide") : t("log_show")}</button>
                </div></div>

              <label className="remember"><input type="checkbox" defaultChecked /> {t("log_remember")}</label>
              {alert}
              {locked && <button type="button" className="btn ghost full" style={{ marginTop: 8 }} onClick={() => { setErr(""); authMode("unlock"); }}>{t("log_unlock_title")}</button>}
              <button className="btn full" style={{ marginTop: 8 }} type="submit" disabled={busy}>{busy ? t("log_working") : t("log_signin")}</button>

              {passkeyAvailable && role !== "admin" && (
                <button type="button" className="btn ghost full" style={{ marginTop: 8 }} onClick={passkey} disabled={busy}>
                  <FiKey aria-hidden="true" /> Use fingerprint or Face ID
                </button>
              )}

              <p className="form-note" style={{ marginTop: 12 }}>
                <button type="button" className="link" onClick={() => authMode("reset")}>{t("log_forgot")}</button> · <button type="button" className="link" onClick={() => authMode("register")}>{t("log_create")}</button>
              </p>

              {GOOGLE_ID && role === "customer" && (
                <>
                  <div className="auth-or"><span>{t("log_or")}</span></div>
                  <button type="button" className="btn ghost full" onClick={google}>{t("log_google")}</button>
                </>
              )}
            </>
          )}

          {m === "register" && (
            <>
              <h1>{t("log_create")}</h1>
              <div className="field"><label>{t("full_name")}</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></div>
              <div className="field" style={{ marginTop: 12 }}><label>{t("phone_num")}</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+250 784 804 739" required /></div>
              <div className="field" style={{ marginTop: 12 }}><label>{t("email")}</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
              <div className="field" style={{ marginTop: 12 }}><label>{t("log_password")}</label><input type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required /><small className="muted">{t("log_pw_hint")}</small></div>
              {alert}
              <button className="btn full" style={{ marginTop: 16 }} type="submit" disabled={busy}>{busy ? t("log_working") : t("log_continue")}</button>
              <p className="form-note" style={{ marginTop: 12 }}><button type="button" className="link" onClick={() => authMode("login")}>{t("log_have")}</button></p>
            </>
          )}

          {m === "verify" && (
            <>
              <h1>{t("log_enter_code")}</h1>
              <p className="muted">We sent a six-digit code to {state.acc.pendingPhone || "your phone"}.</p>
              <OtpInput value={code} onChange={setCode} autoFocus disabled={busy} />
              {devHint}
              {alert}
              <button className="btn full" style={{ marginTop: 16 }} type="submit" disabled={busy || code.length < 6}>{busy ? t("log_working") : t("continue")}</button>
              <p className="form-note" style={{ marginTop: 12 }}>
                {resendIn > 0
                  ? <span className="muted">{t("log_resend_in")} {resendIn}s</span>
                  : (
                    <button type="button" className="link" onClick={() => {
                      setResendIn(30);
                      run(() => otpResend().catch(e => { setResendIn(0); throw e; }));
                    }}>{t("log_send_again")}</button>
                  )} · <button type="button" className="link" onClick={() => authMode("login")}>{t("log_back_signin")}</button>
              </p>
            </>
          )}

          {m === "reset" && (
            <>
              <h1>{t("log_forgot")}</h1>
              <div className="field"><label>{t("phone_num")}</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+250 784 804 739" required />
                <button type="button" className="link" style={{ display: "inline", marginTop: 4 }} onClick={() => run(() => forgotPassword(f))}>{t("log_send_code")}</button></div>
              <p className="muted" style={{ marginTop: 8 }}>{t("log_enter_code")}</p>
              <OtpInput value={code} onChange={setCode} disabled={busy} />
              <div className="field" style={{ marginTop: 12 }}><label>{t("log_new_password")}</label><input type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required /></div>
              {devHint}
              {alert}
              <button className="btn full" style={{ marginTop: 16 }} type="submit" disabled={busy || code.length < 6}>{busy ? t("log_working") : t("log_continue")}</button>
              <p className="form-note" style={{ marginTop: 12 }}><button type="button" className="link" onClick={() => authMode("login")}>{t("log_back_signin")}</button></p>
            </>
          )}
        </form>

        <div className="login-foot">
          <a className="link" href="#/">{t("log_guest")}</a>
        </div>
      </div>
    </AuthShell>
  );
}
