import { useStore, state, logout } from "../store";
import { t } from "../i18n";

export default function Staff() {
  useStore();

  if (!state.user || !["staff", "admin"].includes(state.user.role)) {
    return (
      <>
        <div className="page-head"><div className="container"><span className="kicker">{t("portal_staff")}</span><h1>{t("sign_in")}</h1></div></div>
        <div className="page-body"><div className="container">
          <div className="empty-state"><h3>{t("log_role_staff_sub")}</h3><a className="btn" href="#/login">{t("log_signin")}</a></div>
        </div></div>
      </>
    );
  }

  return (
    <>
      <div className="page-head"><div className="container">
        <span className="kicker">{t("portal_staff")}</span>
        <h1>{state.user.name || state.user.phone}</h1>
        <p className="muted">{t("log_role_staff_sub")}</p>
      </div></div>
      <div className="page-body"><div className="container">
        <div className="card-box" style={{ maxWidth: 620 }}>
          <h3>{t("log_role_staff")}</h3>
          <p className="muted" style={{ marginTop: 8 }}>
            Your employee workspace — daily tasks, order handling, stock and performance — is arriving in the next phase.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {state.user.role === "admin" && <a className="btn sm" href="#/admin">{t("portal_admin")}</a>}
            <button className="btn ghost sm" onClick={logout}>{t("logout")}</button>
          </div>
        </div>
      </div></div>
    </>
  );
}
