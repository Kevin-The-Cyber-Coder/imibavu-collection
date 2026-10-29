/* Imibavu Collection — portal shell.
   One shared chrome for the Super Admin and Employee dashboards: a collapsible
   sidebar (slide-out on phones), a top bar with global search, notifications,
   language, theme toggle and the profile menu, plus a mobile bottom bar. */
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";
import { state, setLang, go, logout, brandName } from "../store";
import { notify } from "../utils/notify";
import { getTheme, setTheme, isFollowingDevice } from "../utils/theme";
import { PRODUCTS } from "../data";
import { money } from "../utils";
import ProductImage from "./ProductImage";
import {
  FiGrid, FiPackage, FiBox, FiShoppingCart, FiUsers, FaUserTie, FiTag, FiCalendar,
  FiBarChart2, FiSettings, FiFileText, FiSearch, FiBell, FiGlobe, FiSun, FiMoon,
  FiMenu, FiX, FiChevronDown, FiChevronLeft, FiChevronRight, FiLogOut, FiUser,
  FiShield, FiMessageSquare, FiStar, FiHome, FiShoppingBag,
  FiHeart, FiRepeat, FiGift, FiLock, FiHelpCircle, FiSliders, FiAward,
} from "./Icons";

/* ---------------- navigation model ---------------- */
/* `area` is the permission area checked against the employee's granted
   permissions; items without one are visible to every signed-in employee. */
export const NAV_GROUPS = [
  {
    id: "main", label: "Overview",
    items: [
      { id: "", label: "dashboard", icon: FiGrid, hash: "#/admin", roles: ["admin", "staff"] },
    ],
  },
  {
    id: "catalog", label: "Catalog",
    items: [
      { id: "products", label: "products_nav", icon: FiPackage, hash: "#/admin/products", area: "products" },
      { id: "inventory", label: "Inventory", icon: FiBox, hash: "#/admin/inventory", area: "inventory" },
      { id: "brands", label: "Brands & collections", icon: FiSliders, hash: "#/admin/brands", area: "brands" },
    ],
  },
  {
    id: "sales", label: "Sales",
    items: [
      { id: "orders", label: "orders_nav", icon: FiShoppingCart, hash: "#/admin/orders", area: "orders" },
      { id: "customers", label: "Customers", icon: FiUsers, hash: "#/admin/customers", area: "customers" },
      { id: "reviews", label: "reviews_title", icon: FiMessageSquare, hash: "#/admin/reviews", area: "reviews" },
    ],
  },
  {
    id: "people", label: "People",
    items: [
      { id: "employees", label: "Employees", icon: FaUserTie, hash: "#/admin/employees", area: "employees", roles: ["admin"] },
    ],
  },
  {
    id: "marketing", label: "Marketing",
    items: [
      { id: "marketing", label: "Marketing", icon: FiTag, hash: "#/admin/marketing", area: "marketing" },
      { id: "subscribers", label: "WhatsApp subscribers", icon: FiRepeat, hash: "#/admin/marketing/subscribers", area: "marketing" },
    ],
  },
  {
    id: "experience", label: "Bookings & blends",
    items: [
      { id: "bookings", label: "bookings", icon: FiCalendar, hash: "#/admin/bookings", area: "bookings" },
      { id: "quiz", label: "Scent Finder quiz", icon: FiHelpCircle, hash: "#/admin/quiz", area: "bookings" },
    ],
  },
  {
    id: "reports", label: "Insights",
    items: [
      { id: "reports", label: "reports", icon: FiBarChart2, hash: "#/admin/reports" },
      { id: "audit", label: "audit_log", icon: FiFileText, hash: "#/admin/audit" },
    ],
  },
  {
    id: "system", label: "System",
    items: [
      { id: "settings", label: "settings", icon: FiSettings, hash: "#/admin/settings", roles: ["admin"] },
    ],
  },
];

/* ---------------- permission model ---------------- */
/* Presets are templates only: the Super Admin ticks the real boxes per account. */
export const PERMISSION_AREAS = [
  ["orders", "Orders"],
  ["products", "Products"],
  ["inventory", "Inventory"],
  ["customers", "Customers"],
  ["reviews", "Reviews"],
  ["returns", "Returns"],
  ["messages", "Messages"],
  ["bookings", "Bookings and blends"],
  ["marketing", "Marketing and coupons"],
  ["brands", "Brands and collections"],
  ["money", "Revenue and profit figures"],
  ["employees", "Employee management"],
  ["settings", "Settings"],
  ["audit", "Audit log"],
  ["export", "Full customer export"],
];

export const ROLE_PRESETS = {
  order_handler: {
    label: "Order Handler",
    areas: ["orders", "customers"],
    shows: "Orders assigned to me, to pack and deliver today, unpaid orders, quick create order",
  },
  inventory_clerk: {
    label: "Inventory Clerk",
    areas: ["products", "inventory"],
    shows: "Low and out-of-stock alerts, recently updated and draft products, stock adjustments",
  },
  support_agent: {
    label: "Support Agent",
    areas: ["messages", "returns", "reviews", "bookings"],
    shows: "Open messages, return requests, reviews to moderate, today's bookings",
  },
  marketing_assistant: {
    label: "Marketing Assistant",
    areas: ["marketing"],
    shows: "Active coupons and usage, subscriber growth, featured products",
  },
};

const DEFAULT_STAFF_AREAS = ["orders"];

/* Mirrors backend/src/constants/permissions.js exactly:
   admin -> null (everything), customer -> [] (nothing), staff -> their granted
   areas, else their preset, else the conservative default. The default only
   ever applies to staff, so a customer never inherits back-office access. */
export function staffAreas() {
  const u = state.user || {};
  if (u.role === "admin") return null; /* null = everything */
  if (u.role !== "staff") return [];
  if (Array.isArray(u.permissions) && u.permissions.length) return u.permissions;
  if (u.permissionPreset && ROLE_PRESETS[u.permissionPreset]) return ROLE_PRESETS[u.permissionPreset].areas;
  return DEFAULT_STAFF_AREAS;
}

export function canAccess(area) {
  const areas = staffAreas();
  if (areas === null) return true;
  if (!area) return true;
  return areas.includes(area);
}

/* Hidden unless granted: revenue and profit figures, employee management,
   settings, the audit log and the full customer export. */
export function canSeeMoney() { return canAccess("money"); }

/* ---------------- audit log ----------------
   Who changed what and when. Every portal action that changes data records a
   line here, and the Audit log page reads it back. */
const AUDIT_KEY = "imibavu_audit";

export function auditLog(action, entity, detail) {
  const user = state.user || {};
  const list = loadArr(AUDIT_KEY);
  const entry = {
    id: "a" + Date.now() + Math.random().toString(36).slice(2, 6),
    at: Date.now(),
    actor: user.name || user.phone || "System",
    role: user.role || "staff",
    action,
    entity: entity || "—",
    detail: detail || "",
  };
  saveArr(AUDIT_KEY, [entry, ...list].slice(0, 400));
  feedPush({ title: `${action} — ${entry.entity}`, body: entry.detail, tone: "info" });
  return entry;
}

export function useAudit() {
  const [rows, setRows] = useState(() => loadArr(AUDIT_KEY));
  useEffect(() => {
    const sync = () => setRows(loadArr(AUDIT_KEY));
    window.addEventListener("imibavu:feed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("imibavu:feed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return rows;
}

/* ---------------- route parsing ---------------- */
export function parseRoute() {
  const raw = (typeof window !== "undefined" ? window.location.hash.slice(1) : "/") || "/";
  const [path, qs] = raw.split("?");
  return { path, seg: path.split("/").filter(Boolean), params: new URLSearchParams(qs || "") };
}

/* Which sidebar entry lights up: a sub-page such as #/admin/marketing/featured
   still activates its parent group. */
export function activeArea(seg) {
  const sub = seg[1] || "";
  if (sub === "marketing" && seg[2]) return "marketing";
  return sub;
}

/* ---------------- notification feed ---------------- */
const FEED_KEY = "imibavu_feed";
const READ_KEY = "imibavu_feed_read";
const loadArr = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
const saveArr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

/* Toasts that matter are also kept in the bell, so nothing is lost if the
   person was away from the screen. */
export function feedPush(item) {
  const list = loadArr(FEED_KEY);
  const entry = { id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), at: Date.now(), ...item };
  saveArr(FEED_KEY, [entry, ...list].slice(0, 60));
  if (typeof window !== "undefined") window.dispatchEvent(new Event("imibavu:feed"));
  return entry;
}

export function useFeed() {
  const [feed, setFeed] = useState(() => loadArr(FEED_KEY));
  useEffect(() => {
    const sync = () => setFeed(loadArr(FEED_KEY));
    window.addEventListener("imibavu:feed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("imibavu:feed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return feed;
}

const relative = ts => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

/* ---------------- top bar pieces ---------------- */
function NotificationsBell() {
  const feed = useFeed();
  const [open, setOpen] = useState(false);
  const [readAt, setReadAt] = useState(() => Number(loadArr(READ_KEY)[0]) || 0);
  const ref = useRef(null);
  const unread = feed.filter(n => n.at > readAt).length;

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const markRead = () => {
    const now = Date.now();
    saveArr(READ_KEY, [now]);
    setReadAt(now);
  };

  return (
    <div className="pt-bell" ref={ref}>
      <button type="button" className="icon-btn" aria-label={`${t("notifications")} (${unread})`}
        aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <FiBell />
        {unread > 0 && <span className="bell-dot" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="pt-drop" role="dialog" aria-label={t("notifications")}>
          <div className="pt-drop-head">
            <b>{t("notifications")}</b>
            {unread > 0 && <button type="button" className="link" onClick={markRead}>{t("mark_all_read")}</button>}
          </div>
          <ul className="feed-list">
            {feed.length === 0 && <li className="feed-empty">{t("no_notifications")}</li>}
            {feed.slice(0, 12).map(n => (
              <li key={n.id} className={n.at > readAt ? "unread" : undefined}>
                <span className={`feed-ico ${n.tone || "info"}`} aria-hidden="true"><FiBell /></span>
                <div>
                  <b>{n.title}</b>
                  {n.body && <p>{n.body}</p>}
                  <small>{relative(n.at)}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const user = state.user || {};
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const initials = String(user.name || user.phone || "?").trim().slice(0, 2).toUpperCase();

  const doLogout = async () => {
    setOpen(false);
    const ok = await notify.confirm({
      title: "Log out of Imibavu?",
      text: "You will need to sign in again on this device.",
      confirmText: t("logout"),
      cancelText: t("cancel"),
      danger: true,
    });
    if (ok) { logout(); notify.success("Signed out"); go("#/login"); }
  };

  return (
    <div className="pt-profile" ref={ref}>
      <button type="button" className="pt-profile-btn" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <span className="avatar" aria-hidden="true">{initials}</span>
        <span className="pt-profile-text">
          <b>{user.name || user.phone || "—"}</b>
          <small>{user.role === "admin" ? t("portal_admin") : t("portal_staff")}</small>
        </span>
        <FiChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="pt-drop right" role="menu">
          <a role="menuitem" href="#/admin/profile" onClick={() => setOpen(false)}><FiUser /> {t("profile")}</a>
          <a role="menuitem" href="#/admin/settings" onClick={() => setOpen(false)}><FiLock /> {t("security_privacy")}</a>
          <button role="menuitem" type="button" onClick={doLogout} className="danger"><FiLogOut /> {t("logout")}</button>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const needle = q.trim().toLowerCase();

  /* "/" focuses search and Escape closes it — desktop power-user shortcuts. */
  useEffect(() => {
    const onKey = e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ""));
      if (e.key === "/" && !typing) { e.preventDefault(); if (inputRef.current) inputRef.current.focus(); }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const source = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;

  const hits = useMemo(() => {
    if (needle.length < 2) return { products: [], orders: [], customers: [] };
    return {
      products: PRODUCTS.filter(p => (p.name + " " + brandName(p.brand) + " " + p.category).toLowerCase().includes(needle)).slice(0, 4),
      orders: (source || []).filter(o => String(o.code + " " + (o.name || "") + " " + (o.phone || "")).toLowerCase().includes(needle)).slice(0, 3),
      customers: [...new Map((source || []).map(o => [o.phone, o])).values()]
        .filter(o => String((o.name || "") + " " + (o.phone || "")).toLowerCase().includes(needle)).slice(0, 3),
    };
  }, [needle, source]);

  const total = hits.products.length + hits.orders.length + hits.customers.length;
  const show = open && needle.length >= 2;

  return (
    <div className="pt-global-search">
      <FiSearch aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        placeholder={t("search_all")}
        aria-label={t("search_all")}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onKeyDown={e => {
          if (e.key === "Enter" && hits.products[0]) { go("#/admin/products?q=" + encodeURIComponent(q)); setOpen(false); }
        }}
      />
      <kbd aria-hidden="true">/</kbd>
      {show && (
        <div className="pt-drop search-drop" role="listbox" aria-label={t("search_all")}>
          {total === 0 && <p className="drop-empty">{t("no_results")}</p>}
          {hits.products.length > 0 && <p className="drop-group">Products</p>}
          {hits.products.map(p => (
            <a key={p.id} href={"#/admin/products?q=" + encodeURIComponent(p.name)} role="option" aria-selected="false">
              <ProductImage product={p} alt="" />
              <span><b>{p.name}</b><small>{brandName(p.brand)} · {money(p.price)}</small></span>
            </a>
          ))}
          {hits.orders.length > 0 && <p className="drop-group">Orders</p>}
          {hits.orders.map(o => (
            <a key={o.code} href={"#/admin/orders?q=" + encodeURIComponent(o.code)} role="option" aria-selected="false">
              <span className="drop-ico" aria-hidden="true"><FiShoppingCart /></span>
              <span><b>{o.code}</b><small>{(o.name || o.phone)} · {money(o.total)}</small></span>
            </a>
          ))}
          {hits.customers.length > 0 && <p className="drop-group">Customers</p>}
          {hits.customers.map(c => (
            <a key={c.phone} href={"#/admin/customers?q=" + encodeURIComponent(c.phone)} role="option" aria-selected="false">
              <span className="drop-ico" aria-hidden="true"><FiUser /></span>
              <span><b>{c.name || "Customer"}</b><small>{c.phone}</small></span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setThemeState] = useState(() => getTheme());
  const following = isFollowingDevice();
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); setThemeState(next);
    notify.info(next === "dark" ? t("dark_mode") : t("light_mode"));
  };
  return (
    <button type="button" className="icon-btn" onClick={toggle}
      aria-label={theme === "dark" ? t("light_mode") : t("dark_mode")}
      title={following ? "Following your device setting" : undefined}>
      {theme === "dark" ? <FiSun /> : <FiMoon />}
    </button>
  );
}

function LangSwitch() {
  return (
    <label className="lang-switch pt-lang" aria-label={t("language")}>
      <FiGlobe aria-hidden="true" />
      <select value={state.lang} onChange={e => setLang(e.target.value)} aria-label={t("language")}>
        <option value="en">EN</option>
        <option value="rw">RW</option>
        <option value="fr">FR</option>
      </select>
    </label>
  );
}

/* ---------------- sidebar ---------------- */
function Sidebar({ route, collapsed, onNavigate, onCollapse }) {
  const areas = staffAreas();
  const groups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(it => {
      if (it.roles && !it.roles.includes((state.user || {}).role)) return false;
      if (!it.area) return true;
      return canAccess(it.area);
    }),
  })).filter(g => g.items.length);

  const activeId = activeArea(route.seg);

  return (
    <aside className={`pt-side ${collapsed ? "collapsed" : ""}`} aria-label="Portal navigation">
      <div className="pt-side-head">
        <a className="pt-logo" href="#/admin" onClick={onNavigate}>
          <img className="logo-mark" src={process.env.PUBLIC_URL + "/logo.jpg"} alt="" />
          <span className="pt-logo-text">Imibavu<em>Portal</em></span>
        </a>
        <button type="button" className="icon-btn pt-collapse" onClick={onCollapse} aria-label={t("collapse_menu")}>
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        <button type="button" className="icon-btn pt-side-close" onClick={onNavigate} aria-label={t("close")}>
          <FiX />
        </button>
      </div>
      <nav className="pt-side-nav">
        {groups.map(g => (
          <div className="pt-group" key={g.id}>
            <p className="pt-group-label">{g.label}</p>
            <ul>
              {g.items.map(it => {
                const Icon = it.icon;
                const on = activeId === it.id || (it.id === "" && route.seg.length <= 1);
                return (
                  <li key={g.id + it.id}>
                    <a href={it.hash} className={on ? "on" : undefined} onClick={onNavigate}
                      aria-current={on ? "page" : undefined} title={collapsed ? t(it.label) : undefined}>
                      <Icon aria-hidden="true" />
                      <span>{t(it.label)}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {areas !== null && (
          <div className="pt-group">
            <button type="button" className="pt-request"
              onClick={() => notify.success("Access request sent to the Super Admin")}>
              <FiShield aria-hidden="true" /> {t("request_access")}
            </button>
          </div>
        )}
      </nav>
    </aside>
  );
}

/* ---------------- mobile bottom bar ---------------- */
function BottomBar({ route }) {
  const sub = route.seg[1] || "";
  const items = [
    { id: "", label: t("dashboard"), icon: FiGrid, hash: "#/admin", show: true },
    { id: "orders", label: t("orders_nav"), icon: FiShoppingCart, hash: "#/admin/orders", show: canAccess("orders") },
    { id: "products", label: t("products_nav"), icon: FiPackage, hash: "#/admin/products", show: canAccess("products") },
    { id: "__more", label: t("more"), icon: FiMenu, hash: "", show: true },
  ].filter(i => i.show);

  return (
    <nav className="pt-bottombar" aria-label="Quick navigation">
      {items.map(i => {
        const Icon = i.icon;
        const on = i.id !== "__more" && sub === i.id;
        if (i.id === "__more") {
          return (
            <button key={i.id} type="button" className="pt-bb-item"
              onClick={() => document.body.classList.toggle("pt-nav-open")}>
              <Icon aria-hidden="true" /><span>{i.label}</span>
            </button>
          );
        }
        return (
          <a key={i.id} href={i.hash} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            <Icon aria-hidden="true" /><span>{i.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

/* ---------------- access denied ---------------- */
export function AccessDenied({ area }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="access-denied">
      <FiShield aria-hidden="true" />
      <h2>{t("access_denied")}</h2>
      <p className="muted">
        This area is not part of your permissions{area ? ` (${area})` : ""}. A Super Admin can grant it from
        Employees → permissions.
      </p>
      {sent
        ? <p className="pill ok">{t("request_access")} ✓</p>
        : <button className="btn" type="button" onClick={() => { setSent(true); notify.success("Request sent to the Super Admin"); }}>
            {t("request_access")}
          </button>}
      <a className="btn ghost sm" href="#/admin">{t("dashboard")}</a>
    </div>
  );
}

/* ---------------- session timeout warning ---------------- */
export function useSessionWarning(minutes = 28) {
  const userId = state.user && state.user.id;
  useEffect(() => {
    if (!userId) return;
    const id = setTimeout(() => {
      notify.countdown({
        title: t("session_warning"),
        html: "You will be signed out in <b data-countdown>60</b> seconds. Any unsaved changes may be lost.",
        seconds: 60,
        confirmText: t("stay_signed_in"),
        cancelText: t("logout"),
      }).then(r => { if (r === "leave") { logout(); go("#/login"); } });
    }, minutes * 60 * 1000);
    return () => clearTimeout(id);
  }, [userId, minutes]);
}

/* ---------------- onboarding tour ---------------- */
const TOUR_KEY = "imibavu_tour_done";
export function useOnboardingTour(steps) {
  const userId = state.user && state.user.id;
  useEffect(() => {
    if (!userId || !steps || !steps.length) return;
    let done = false;
    try { done = localStorage.getItem(TOUR_KEY) === "1"; } catch (e) { /* ignore */ }
    if (done) return;
    const id = setTimeout(() => {
      notify.tour(steps).then(() => { try { localStorage.setItem(TOUR_KEY, "1"); } catch (e) { /* ignore */ } });
    }, 900);
    return () => clearTimeout(id);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------------- the shell ---------------- */
export default function PortalShell({ route, children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("imibavu_side") === "1"; } catch (e) { return false; }
  });
  const [drawer, setDrawer] = useState(false);

  /* Slide-out drawer on phones and tablets; icon-only sidebar on desktop. */
  useEffect(() => {
    const apply = () => { if (window.innerWidth < 1024) setDrawer(false); };
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("imibavu_side", next ? "1" : "0"); } catch (e) { /* ignore */ }
      return next;
    });
  };

  const area = route.seg[1] || "";
  const gated = ["products", "inventory", "brands", "orders", "customers", "reviews", "employees", "marketing", "bookings"].includes(area);
  const allowed = !gated || canAccess(area);

  return (
    <div className={`pt-shell ${collapsed ? "is-collapsed" : ""} ${drawer ? "drawer-open" : ""}`}>
      <Sidebar route={route} collapsed={collapsed} onNavigate={() => setDrawer(false)} onCollapse={toggleCollapse} />
      <div className="pt-main">
        <header className="pt-topbar">
          <button type="button" className="icon-btn pt-hamburger" aria-label={t("dashboard")}
            aria-expanded={drawer} onClick={() => setDrawer(d => !d)}>
            <FiMenu />
          </button>
          <GlobalSearch />
          <div className="pt-top-actions">
            <NotificationsBell />
            <LangSwitch />
            <ThemeToggle />
            <ProfileMenu />
          </div>
        </header>
        <main className="pt-content" id="portal-content">
          {allowed ? children : <AccessDenied area={area} />}
        </main>
      </div>
      {drawer && <div className="pt-scrim" onClick={() => setDrawer(false)} role="presentation" />}
      <BottomBar route={route} />
    </div>
  );
}

/* ---------------- customer-side menu (inside the storefront chrome) -------- */
export function CustomerMenu({ route, children }) {
  const sub = route.seg[1] || "";
  const links = [
    ["", "dashboard", FiGrid], ["orders", "orders_nav", FiShoppingBag], ["wish", "wishlist_nav", FiHeart],
    ["blends", "saved_blends", FiPackage], ["bookings", "bookings", FiCalendar], ["rewards", "loyalty", FiAward],
    ["addresses", "addresses", FiHome], ["returns", "returns", FiRepeat], ["reviews", "reviews_title", FiStar],
    ["offers", "offers", FiGift], ["notifications", "notifications", FiBell], ["security", "security_privacy", FiLock],
  ];
  return (
    <div className="cu-shell">
      <nav className="cu-nav" aria-label={t("account")}>
        {links.map(([id, label, Icon]) => {
          const on = sub === id;
          return (
            <a key={id || "dashboard"} href={"#/account" + (id ? "/" + id : "")} className={on ? "on" : undefined}
              aria-current={on ? "page" : undefined}>
              <Icon aria-hidden="true" /><span>{t(label)}</span>
            </a>
          );
        })}
      </nav>
      <div className="cu-body">{children}</div>
    </div>
  );
}
