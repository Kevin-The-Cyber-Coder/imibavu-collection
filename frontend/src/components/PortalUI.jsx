/* Imibavu Collection — shared portal UI primitives.
   Used by the Super Admin dashboard, the Employee dashboard and the Customer
   account area, so cards, tables, badges, KPIs and empty states stay identical. */
import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { notify } from "../utils/notify";
import { stockOf } from "../store";
import ProductImage from "./ProductImage";
import {
  FiSearch, FiX, FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown,
  FiInbox, FiInfo, FiDownload,
} from "./Icons";

export const cx = (...parts) => parts.filter(Boolean).join(" ");

/* ---------------- page scaffolding ---------------- */
export function PortalPage({ title, crumbs = [], action, children, wide }) {
  return (
    <div className={cx("portal-page", wide && "wide")}>
      <header className="pp-head">
        <div className="pp-head-text">
          {crumbs.length > 0 && (
            <nav className="crumbs" aria-label="Breadcrumb">
              {crumbs.map((c, i) => (
                <span key={c.label + i}>
                  {c.href ? <a href={c.href}>{c.label}</a> : <b>{c.label}</b>}
                  {i < crumbs.length - 1 && <i aria-hidden="true">/</i>}
                </span>
              ))}
            </nav>
          )}
          <h1>{title}</h1>
        </div>
        {action && <div className="pp-head-action">{action}</div>}
      </header>
      {children}
    </div>
  );
}

export function SectionCard({ title, action, children, className, as: Tag = "section" }) {
  return (
    <Tag className={cx("pcard", className)}>
      {(title || action) && (
        <div className="pcard-head">
          {title && <h3>{title}</h3>}
          {action && <div className="pcard-action">{action}</div>}
        </div>
      )}
      <div className="pcard-body">{children}</div>
    </Tag>
  );
}

/* ---------------- states ---------------- */
export function EmptyState({ icon, title, text, action, compact }) {
  const Icon = icon || FiInbox;
  return (
    <div className={cx("empty-state", compact && "compact")}>
      <Icon className="es-icon" aria-hidden="true" />
      <h3>{title || t("no_results")}</h3>
      <p className="muted">{text || t("empty_hint")}</p>
      {action}
    </div>
  );
}

export function Skeleton({ rows = 3, className }) {
  return (
    <div className={cx("sk-wrap", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton sk-row" key={i} style={{ width: `${92 - i * 9}%` }} />
      ))}
    </div>
  );
}

export function LoadingBlock({ label }) {
  return (
    <div className="pcard">
      <div className="pcard-body">
        <Skeleton rows={4} />
        <p className="muted center" style={{ marginTop: 10 }}>{label || t("loading")}</p>
      </div>
    </div>
  );
}

/* ---------------- badges ---------------- */
/* Status colours stay consistent everywhere: Pending amber, Confirmed blue,
   Packed purple, Out for delivery indigo, Delivered green, Cancelled red. */
export const STATUS_TONE = {
  received: "info", pending: "warn", confirmed: "info", packed: "purple",
  processing: "info", shipped: "indigo", "out for delivery": "indigo",
  delivered: "ok", completed: "ok", cancelled: "bad", canceled: "bad",
  refunded: "bad", failed: "bad", unpaid: "warn", paid: "ok", active: "ok",
  paused: "warn", hidden: "bad", approved: "ok", draft: "warn", published: "ok",
  archived: "bad", blocked: "bad", low: "warn", out: "bad", in: "ok",
};

export function Badge({ children, tone, icon: Icon }) {
  const key = String(children || "").trim().toLowerCase();
  const resolved = tone || STATUS_TONE[key] || "";
  return (
    <span className={cx("pill", resolved)}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ---------------- KPI cards ---------------- */
export function Sparkline({ points = [], tone = "gold" }) {
  const data = points.length ? points : [0, 0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const w = 100;
  const h = 26;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const coords = data.map((v, i) => [i * step, h - ((v - min) / span) * (h - 4) - 2]);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg className={cx("spark", tone)} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="spark-area" d={area} />
      <path className="spark-line" d={line} />
    </svg>
  );
}

export function KpiCard({ label, value, change, points, tone = "gold", hint, icon: Icon, href }) {
  const up = typeof change === "number" ? change >= 0 : null;
  const Tag = href ? "a" : "div";
  return (
    <Tag className="kpi" href={href}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {Icon && <Icon className="kpi-ico" aria-hidden="true" />}
      </div>
      <b className="kpi-value">{value}</b>
      <div className="kpi-foot">
        {typeof change === "number" && (
          <span className={cx("kpi-change", up ? "up" : "down")}>
            {up ? <FiTrendingUp aria-hidden="true" /> : <FiTrendingDown aria-hidden="true" />}
            {up ? "+" : ""}{change}%
          </span>
        )}
        <span className="kpi-hint">{hint || t("vs_prev")}</span>
      </div>
      <Sparkline points={points} tone={tone} />
    </Tag>
  );
}

/* ---------------- tables that become cards on phones ---------------- */
/* columns: [{ key, label, render(row), primary, hideOnCard, align }] */
export function DataTable({ columns, rows, rowKey, onRowClick, empty, actions, caption }) {
  const [openRow, setOpenRow] = useState(null);
  if (!rows || !rows.length) {
    return empty || <EmptyState />;
  }
  return (
    <>
      <div className="table-wrap pt-table">
        <table className="data">
          {caption && <caption className="sr">{caption}</caption>}
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} className={cx(c.align && "ta-" + c.align)}>{c.label}</th>
              ))}
              {actions && <th className="ta-right">{t("actions")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={rowKey ? rowKey(row, i) : i} onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "clickable" : undefined}>
                {columns.map(c => (
                  <td key={c.key} data-label={c.label} className={cx(c.align && "ta-" + c.align)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
                {actions && <td className="row-actions ta-right" data-label={t("actions")}>{actions(row, i)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phones: stacked cards with the key fields and a View button */}
      <div className="pt-cards">
        {rows.map((row, i) => {
          const primary = columns.find(c => c.primary) || columns[0];
          const rest = columns.filter(c => c !== primary).slice(0, 3);
          const open = openRow === i;
          return (
            <article className="pt-card" key={rowKey ? rowKey(row, i) : i}>
              <div className="ptc-top">
                <div className="ptc-primary">{primary.render ? primary.render(row) : row[primary.key]}</div>
                <button className="mini-btn" type="button" aria-expanded={open}
                  onClick={() => setOpenRow(open ? null : i)}>
                  {open ? t("close") : t("view")}
                  {open ? <FiChevronUp aria-hidden="true" /> : <FiChevronDown aria-hidden="true" />}
                </button>
              </div>
              {open && (
                <dl className="ptc-fields">
                  {rest.concat(actions ? [{ key: "__actions", label: t("actions") }] : []).map(c => (
                    <div key={c.key}>
                      <dt>{c.label}</dt>
                      <dd>{c.key === "__actions" ? actions(row, i) : (c.render ? c.render(row) : row[c.key])}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {onRowClick && (
                <button className="ptc-open" type="button" onClick={() => onRowClick(row)}>
                  {t("view")}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- filters ---------------- */
export const RANGES = [
  ["today", "today"],
  ["7d", "last_7"],
  ["30d", "last_30"],
  ["month", "this_month"],
  ["custom", "custom"],
];

export function RangeFilter({ value, onChange, extra }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  return (
    <div className="range-filter" role="group" aria-label={t("filters")}>
      <div className="range-chips">
        {RANGES.map(([id, label]) => (
          <button key={id} type="button" className={cx("chip", value === id && "on")}
            aria-pressed={value === id} onClick={() => onChange(id)}>
            {t(label)}
          </button>
        ))}
      </div>
      {value === "custom" && (
        <div className="range-dates">
          <label>{t("from")}<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>{t("to")}<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
      )}
      {extra}
    </div>
  );
}

export function ExportButton({ onExport, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="export-wrap" ref={ref}>
      <button type="button" className="btn ghost sm" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <FiDownload aria-hidden="true" /> {label || t("export")}
      </button>
      {open && (
        <div className="export-menu" role="menu">
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onExport("csv"); }}>{t("export_csv")}</button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onExport("pdf"); }}>{t("export_pdf")}</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- search ---------------- */
export function matches(haystack, needle) {
  return String(haystack || "").toLowerCase().includes(String(needle || "").toLowerCase().trim());
}

export function SearchBox({ value, onChange, placeholder, suggestions = [], onPick, id }) {
  const [focus, setFocus] = useState(false);
  const listId = id || "pt-search-list";
  const hits = value && value.trim().length >= 2 ? suggestions.slice(0, 6) : [];
  return (
    <div className="pt-search">
      <FiSearch aria-hidden="true" />
      <input
        type="search"
        value={value}
        placeholder={placeholder || t("search_all")}
        aria-label={placeholder || t("search_all")}
        aria-autocomplete="list"
        aria-controls={listId}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 160)}
      />
      {value && (
        <button type="button" className="pt-search-clear" aria-label={t("reset")} onClick={() => onChange("")}>
          <FiX aria-hidden="true" />
        </button>
      )}
      {focus && hits.length > 0 && (
        <ul className="pt-suggest" id={listId} role="listbox">
          {hits.map((s, i) => (
            <li key={s.id || i} role="option" aria-selected="false">
              <button type="button" onMouseDown={() => onPick && onPick(s)}>
                {s.img && <ProductImage product={s.img} alt="" />}
                <span><b>{s.label}</b>{s.sub && <small>{s.sub}</small>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- misc ---------------- */
export function InfoNote({ children, tone = "info" }) {
  return (
    <p className={cx("info-note", tone)}>
      <FiInfo aria-hidden="true" /> <span>{children}</span>
    </p>
  );
}

export function StockPill({ product }) {
  const st = product ? stockOf(product) : "in";
  const label = st === "out" ? t("out_stock") : st === "low" ? t("low_stock") : t("in_stock");
  return <Badge tone={st === "in" ? "ok" : st === "low" ? "warn" : "bad"}>{label}</Badge>;
}

/* Simplified revenue sparkline data from an order list (last 7 buckets). */
export function trendPoints(list, pick, buckets = 7) {
  const out = new Array(buckets).fill(0);
  (list || []).forEach((o, i) => { out[i % buckets] += Number(pick(o)) || 0; });
  return out;
}

export const money0 = n => Number(n || 0).toLocaleString("en-RW");

/* ---------------- modal (bottom sheet on phones) ---------------- */
export function Modal({ open, title, onClose, children, footer, size }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("no-scroll");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("no-scroll");
    };
  }, [open, onClose]);

  const titleId = "pt-modal-title";
  if (!open) return null;
  return (
    <div className="pt-modal-scrim" onClick={onClose} role="presentation">
      <div className={cx("pt-modal", size && "size-" + size)} role="dialog" aria-modal="true" aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}>
        <header className="pt-modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t("close")}><FiX /></button>
        </header>
        <div className="pt-modal-body">{children}</div>
        {footer && <footer className="pt-modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* Toast on the way out, and the matching bell entry. */
export function reportDone(message, tone) {
  if (tone === "error") notify.error(message);
  else notify.success(message);
}
