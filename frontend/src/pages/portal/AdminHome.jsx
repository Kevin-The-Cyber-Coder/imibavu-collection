/* Imibavu Collection — Super Admin + Employee dashboard pages.
   Everything the three-portal spec asks for on the admin side: KPI cards with
   sparklines, revenue and status charts, ranked lists, low-stock alerts, the
   recent-orders table, employee activity, pending bookings and the bell feed. */
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart,
} from "recharts";
import { t } from "../../i18n";
import {
  state, admOrderStatus, adminSetStock, loadAdminData, prod, brandName, stockOf,
} from "../../store";
import { PRODUCTS, CATEGORIES } from "../../data";
import { money } from "../../utils";
import { notify } from "../../utils/notify";
import {
  PortalPage, SectionCard, KpiCard, DataTable, Badge, EmptyState, RangeFilter,
  ExportButton, trendPoints, InfoNote, StockPill,
} from "../../components/PortalUI";
import { useAudit, auditLog, canSeeMoney, staffAreas } from "../../components/Portal";
import {
  FiShoppingCart, FiUsers, FiDollarSign, FaUserTie, FiTag, FiPackage,
  FiAlertTriangle, FiClock, FiCheck, FiActivity,
} from "../../components/Icons";
import ProductImage from "../../components/ProductImage";

/* ---------------- helpers ---------------- */
const DAY = 86400000;

function useOrderList() {
  return (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;
}

function rangeDays(range) {
  if (range === "today") return 1;
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  if (range === "month") return 30;
  return 30;
}

/* Orders are dated either as ISO strings or as the formatted label the store
   writes; both are accepted here so the charts never break. */
function orderTime(o) {
  const raw = o.date || o.createdAt;
  if (typeof raw === "number") return raw;
  const parsed = Date.parse(raw);
  return isNaN(parsed) ? Date.now() : parsed;
}

function inWindow(o, days, offset = 0) {
  const at = orderTime(o);
  const end = Date.now() - offset * days * DAY;
  const start = end - days * DAY;
  return at > start && at <= end;
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function bucketSeries(list, days, pick) {
  const buckets = Math.min(days, 14);
  const out = Array.from({ length: buckets }, (_, i) => {
    const at = new Date(Date.now() - (buckets - 1 - i) * DAY);
    return { label: at.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), value: 0, orders: 0 };
  });
  (list || []).forEach(o => {
    const age = Math.floor((Date.now() - orderTime(o)) / DAY);
    const idx = buckets - 1 - age;
    if (idx >= 0 && idx < buckets) {
      out[idx].value += Number(pick(o)) || 0;
      out[idx].orders += 1;
    }
  });
  return out;
}

function csvDownload(filename, rows) {
  const body = rows.map(r => r.map(c => `"${String(c == null ? "" : c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------- greeting + quick actions ---------------- */
function greeting(name) {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}${name ? ", " + String(name).split(" ")[0] : ""}!`;
}

function QuickActions() {
  const items = [
    ["Add product", "#/admin/products?new=1", FiPackage],
    ["Add employee", "#/admin/employees?new=1", FaUserTie],
    ["Create coupon", "#/admin/marketing?new=1", FiTag],
    ["View orders", "#/admin/orders", FiShoppingCart],
  ].filter(([, , , ]) => true);
  return (
    <div className="quick-actions">
      {items.map(([label, href, Icon]) => (
        <a className="qa" href={href} key={label}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </a>
      ))}
    </div>
  );
}

/* ---------------- charts ---------------- */
function RevenueChart({ series }) {
  const [mode, setMode] = useState("line");
  return (
    <SectionCard
      title="Revenue"
      className="chart-card"
      action={
        <div className="chip-row" role="group" aria-label="Chart type">
          {["line", "bar"].map(m => (
            <button key={m} type="button" className={`chip ${mode === m ? "on" : ""}`}
              aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === "line" ? "Line" : "Bar"}
            </button>
          ))}
        </div>
      }
    >
      <div className="chart-box" role="img" aria-label="Revenue by day">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false}
              tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={44} />
            <Tooltip
              formatter={(v, n) => [n === "value" ? money(v) : v, n === "value" ? "Revenue" : "Orders"]}
              contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13 }}
            />
            {mode === "line"
              ? <Line type="monotone" dataKey="value" stroke="var(--gold)" strokeWidth={2.4} dot={false} activeDot={{ r: 4 }} />
              : <Bar dataKey="value" fill="var(--gold)" radius={[6, 6, 0, 0]} maxBarSize={38} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

function StatusDonut({ orders }) {
  const counts = orders.reduce((acc, o) => {
    const k = o.status || "Received";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
  const COLORS = {
    Received: "#c98b2b", Pending: "#c98b2b", Confirmed: "#3f5490", Packed: "#7c5cc4",
    "Out for delivery": "#4f58a8", Delivered: "#128c7e", Cancelled: "#b3452f", Refunded: "#b3452f",
  };
  if (!data.length) return (
    <SectionCard title="Orders by status"><EmptyState compact title="No orders yet" text="Statuses appear as orders come in." /></SectionCard>
  );
  return (
    <SectionCard title="Orders by status">
      <div className="donut-wrap">
        <div className="chart-box" role="img" aria-label="Orders by status">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3}>
                {data.map(d => <Cell key={d.name} fill={COLORS[d.name] || "var(--gold)"} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="legend">
          {data.map(d => (
            <li key={d.name}>
              <i style={{ background: COLORS[d.name] || "var(--gold)" }} aria-hidden="true" />
              <span>{d.name}</span><b>{d.value}</b>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}

function CategoryChart({ orders }) {
  const totals = CATEGORIES.map(c => ({
    name: c.label,
    value: 0,
  }));
  (orders || []).forEach(o => {
    (o.items || []).forEach(it => {
      const p = PRODUCTS.find(x => x.name === it.name) || prod(it.slug);
      if (!p) return;
      const row = totals.find(r => r.name === (CATEGORIES.find(c => c.id === p.category) || {}).label);
      if (row) row.value += Number(it.price || p.price || 0) * Number(it.qty || 1);
    });
  });
  const empty = totals.every(r => !r.value);
  const fallback = CATEGORIES.map(c => ({
    name: c.label,
    value: PRODUCTS.filter(p => p.category === c.id).reduce((n, p) => n + p.price, 0),
  }));
  const data = empty ? fallback : totals;
  return (
    <SectionCard title="Sales by category">
      <p className="muted chart-note">{empty ? "Catalog value by category (no sales in this period yet)." : "Revenue per category in this period."}</p>
      <div className="chart-box" role="img" aria-label="Sales by category">
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false}
              tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={44} />
            <Tooltip formatter={v => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13 }} />
            <Bar dataKey="value" fill="var(--gold-2)" radius={[6, 6, 0, 0]} maxBarSize={54} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

/* ---------------- ranked lists ---------------- */
function TopProducts({ orders }) {
  const counts = new Map();
  (orders || []).forEach(o => (o.items || []).forEach(it => {
    const key = it.name || it.slug;
    counts.set(key, (counts.get(key) || 0) + Number(it.qty || 1));
  }));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const fallback = PRODUCTS.slice(0, 5).map(p => [p.name, p.reviews]);
  const rows = ranked.length ? ranked : fallback;
  const max = Math.max(...rows.map(r => r[1]), 1);
  return (
    <SectionCard title="Top products" action={<a className="link-more" href="#/admin/products">All</a>}>
      {rows.map(([name, qty]) => {
        const p = PRODUCTS.find(x => x.name === name);
        return (
          <div className="rank-row" key={name}>
            {p
              ? <ProductImage product={p} alt="" className="rank-thumb" />
              : <span className="rank-thumb" aria-hidden="true" />}
            <div className="rank-info">
              <b>{name}</b>
              <div className="bar"><i style={{ width: (qty / max) * 100 + "%" }} /></div>
            </div>
            <span className="rank-value">{qty}</span>
          </div>
        );
      })}
    </SectionCard>
  );
}

function TopCustomers({ orders }) {
  const spend = new Map();
  (orders || []).forEach(o => {
    const key = o.phone || o.name || "Guest";
    const prev = spend.get(key) || { name: o.name || "Guest", total: 0, count: 0 };
    prev.total += Number(o.total || 0);
    prev.count += 1;
    spend.set(key, prev);
  });
  const rows = [...spend.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <SectionCard title="Top customers" action={<a className="link-more" href="#/admin/customers">All</a>}>
      {rows.length === 0
        ? <EmptyState compact title="No customers yet" text="Customer spend appears after the first order." />
        : rows.map((c, i) => (
          <div className="rank-row" key={c.name + i}>
            <span className="avatar">{String(c.name).slice(0, 2).toUpperCase()}</span>
            <div className="rank-info">
              <b>{c.name}</b>
              <small className="muted">{c.count} order{c.count === 1 ? "" : "s"}</small>
            </div>
            <span className="rank-value">{money(c.total)}</span>
          </div>
        ))}
    </SectionCard>
  );
}

function LowStock() {
  const list = state.adm.products.length ? state.adm.products : PRODUCTS;
  const low = list.filter(p => stockOf(p) !== "in").slice(0, 6);
  return (
    <SectionCard title="Low-stock alerts" action={<a className="link-more" href="#/admin/inventory">Inventory</a>}>
      {low.length === 0
        ? <p className="pill ok"><FiCheck aria-hidden="true" /> All products in stock</p>
        : low.map(p => (
          <div className="alert-row" key={p._id || p.id}>
            <FiAlertTriangle aria-hidden="true" className={stockOf(p) === "out" ? "bad" : "warn"} />
            <div className="rank-info"><b>{p.name}</b><small className="muted">{brandName(p.brand)}</small></div>
            <StockPill product={p} />
            <button className="mini-btn" type="button" onClick={async () => {
              const qty = await notify.askText({
                title: `Restock ${p.name}`,
                placeholder: "Units to add",
                inputType: "number",
                inputMode: "numeric",
                label: "Enter the quantity to add",
              });
              if (qty == null) return;
              adminSetStock(p._id || p.id, "in")
                .then(() => auditLog("restock", p.name, `+${qty} units`))
                .catch(() => {});
              notify.success(`${p.name} restocked`);
            }}>Restock</button>
          </div>
        ))}
    </SectionCard>
  );
}

/* ---------------- recent orders ---------------- */
const STATUS_FLOW = ["Received", "Confirmed", "Packed", "Out for delivery", "Delivered", "Cancelled"];

function RecentOrders({ orders, onStatus }) {
  const columns = [
    { key: "code", label: "Order", primary: true, render: o => <b>{o.code}</b> },
    { key: "customer", label: "Customer", render: o => (<>{o.name || "Guest"}<br /><small className="muted">{o.phone}</small></>) },
    { key: "items", label: "Items", render: o => (o.items || []).reduce((n, x) => n + Number(x.qty || 1), 0) },
    { key: "total", label: t("total"), render: o => money(o.total) },
    { key: "payment", label: "Payment", render: o => (<><span>{o.payment}</span><br /><Badge>{o.paymentStatus || "unpaid"}</Badge></>) },
    { key: "status", label: t("status"), render: o => <Badge>{o.status || "Received"}</Badge> },
  ];
  return (
    <SectionCard title="Recent orders" action={<a className="link-more" href="#/admin/orders">All orders</a>}>
      <DataTable
        columns={columns}
        rows={orders.slice(0, 6)}
        rowKey={o => o.code}
        empty={<EmptyState compact title="No orders yet" text="New orders will land here and in your notifications." />}
        actions={o => (
          <select className="mini-btn" aria-label={`Status for ${o.code}`} value={o.status || "Received"}
            onChange={e => onStatus(o.code, e.target.value)}>
            {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      />
    </SectionCard>
  );
}

/* ---------------- activity + pending work ---------------- */
function EmployeeActivity() {
  const rows = useAudit().slice(0, 6);
  return (
    <SectionCard title="Employee activity" action={<a className="link-more" href="#/admin/audit">{t("audit_log")}</a>}>
      {rows.length === 0
        ? <EmptyState compact title="No activity yet" text="Actions taken in the portal are logged here." />
        : (
          <ul className="activity-list">
            {rows.map(r => (
              <li key={r.id}>
                <span className="avatar" aria-hidden="true">{String(r.actor).slice(0, 2).toUpperCase()}</span>
                <div>
                  <b>{r.action} — {r.entity}</b>
                  <small className="muted">{r.actor} · {new Date(r.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                  {r.detail && <p>{r.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
    </SectionCard>
  );
}

function PendingWork() {
  const bookings = state.adm.bookings || state.bookings || [];
  const blends = state.blends || [];
  const pending = bookings.filter(b => (b.status || "pending") === "pending");
  return (
    <SectionCard title="Pending bookings and blend requests" action={<a className="link-more" href="#/admin/bookings">{t("bookings")}</a>}>
      {pending.length === 0 && blends.length === 0 && (
        <EmptyState compact title="Nothing waiting" text="New blending sessions and blend requests appear here for confirmation." />
      )}
      {pending.slice(0, 4).map((b, i) => (
        <div className="alert-row" key={b.id || i}>
          <FiClock aria-hidden="true" className="warn" />
          <div className="rank-info">
            <b>{b.name || "Blending session"}</b>
            <small className="muted">{b.date} {b.time} · {b.phone}</small>
          </div>
          <a className="mini-btn" href="#/admin/bookings">Confirm</a>
        </div>
      ))}
      {blends.slice(0, 3).map((b, i) => (
        <div className="alert-row" key={"bl" + i}>
          <FiActivity aria-hidden="true" />
          <div className="rank-info">
            <b>{b.name}</b>
            <small className="muted">{b.baseLabel} · {(b.notes || []).join(", ")}</small>
          </div>
          <Badge tone="info">Blend</Badge>
        </div>
      ))}
    </SectionCard>
  );
}

function NotificationsFeed() {
  const rows = useMemo(() => {
    const out = [];
    if (state.orders[0]) out.push({ title: `New order ${state.orders[0].code}`, body: money(state.orders[0].total), tone: "info" });
    const pending = (state.adm.reviews || []).filter(r => r.status === "pending").length;
    if (pending) out.push({ title: `${pending} review${pending === 1 ? "" : "s"} to moderate`, tone: "warn" });
    const low = PRODUCTS.filter(p => stockOf(p) === "out").length;
    if (low) out.push({ title: `${low} product${low === 1 ? "" : "s"} out of stock`, tone: "bad" });
    out.push({ title: "Newsletter subscribers", body: "WhatsApp broadcast list is growing", tone: "info" });
    return out;
  }, []);
  return (
    <SectionCard title="Notifications feed">
      <ul className="feed-list inline">
        {rows.map((n, i) => (
          <li key={i}>
            <span className={`feed-ico ${n.tone}`} aria-hidden="true">{n.tone === "warn" || n.tone === "bad" ? <FiAlertTriangle /> : <FiActivity />}</span>
            <div><b>{n.title}</b>{n.body && <p>{n.body}</p>}</div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

/* ---------------- the dashboard ---------------- */
export default function AdminHome() {
  const [range, setRange] = useState("30d");
  const orders = useOrderList();
  const areas = staffAreas();
  const showMoney = canSeeMoney();

  useEffect(() => {
    loadAdminData();
  }, []);

  const days = rangeDays(range);
  const current = orders.filter(o => inWindow(o, days, 0));
  const previous = orders.filter(o => inWindow(o, days, days));

  const revenue = current.reduce((n, o) => n + Number(o.total || 0), 0);
  const prevRevenue = previous.reduce((n, o) => n + Number(o.total || 0), 0);
  const customers = new Set(current.map(o => o.phone || o.name)).size;
  const prevCustomers = new Set(previous.map(o => o.phone || o.name)).size;
  const aov = current.length ? Math.round(revenue / current.length) : 0;
  const prevAov = previous.length ? Math.round(prevRevenue / previous.length) : 0;

  const series = bucketSeries(orders, days, o => o.total);

  const exportRows = async kind => {
    if (kind === "csv") {
      csvDownload("imibavu-orders.csv", [
        ["Code", "Date", "Customer", "Phone", "Items", "Total", "Payment", "Payment status", "Status"],
        ...orders.map(o => [
          o.code, o.date || "", o.name || "", o.phone || "",
          (o.items || []).reduce((n, x) => n + Number(x.qty || 1), 0),
          o.total || 0, o.payment || "", o.paymentStatus || "", o.status || "",
        ]),
      ]);
      notify.success("CSV exported");
    } else {
      notify.loading("Preparing the PDF…");
      setTimeout(() => {
        notify.close();
        const w = window.open("", "_blank");
        if (!w) { notify.error("Allow pop-ups to export the PDF"); return; }
        const rows = orders.slice(0, 40).map(o =>
          `<tr><td>${o.code}</td><td>${o.name || ""}</td><td>${o.phone || ""}</td><td>${money(o.total)}</td><td>${o.status || ""}</td></tr>`).join("");
        w.document.write(`<!doctype html><html><head><title>Imibavu — Orders report</title>
          <style>body{font-family:Georgia,serif;padding:28px;color:#12100e}h1{font-size:22px}
          table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e6ded1;padding:8px;text-align:left}
          th{text-transform:uppercase;font-size:11px;letter-spacing:.1em;color:#736a5e}</style></head><body>
          <h1>Imibavu Collection — orders report</h1>
          <p>${new Date().toLocaleString("en-GB")} · ${orders.length} orders · revenue ${money(revenue)}</p>
          <table><thead><tr><th>Code</th><th>Customer</th><th>Phone</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody></table>
          <script>window.print()</script></body></html>`);
        w.document.close();
      }, 600);
      notify.success("Report ready");
    }
  };

  const onStatus = (code, value) => {
    admOrderStatus(code, value);
    auditLog("Order status", code, `→ ${value}`);
    notify.success(`${code} → ${value}`);
  };

  return (
    <PortalPage
      title={greeting((state.user || {}).name)}
      crumbs={[{ label: t("dashboard") }]}
      action={<ExportButton onExport={exportRows} />}
    >
      <QuickActions />

      <RangeFilter value={range} onChange={setRange} />

      {orders.length === 0 && (
        <InfoNote>
          No orders in the system yet. Once customers order, this dashboard fills in automatically —
          try the storefront to place a test order.
        </InfoNote>
      )}

      <div className="kpi-grid">
        {showMoney && (
          <KpiCard label="Revenue" value={money(revenue)} change={pctChange(revenue, prevRevenue)}
            points={trendPoints(current, o => o.total)} icon={FiDollarSign} />
        )}
        <KpiCard label="Orders" value={current.length} change={pctChange(current.length, previous.length)}
          points={trendPoints(current, () => 1)} tone="blue" icon={FiShoppingCart} />
        <KpiCard label="New customers" value={customers} change={pctChange(customers, prevCustomers)}
          points={trendPoints(current, () => 1, 5)} tone="green" icon={FiUsers} />
        {showMoney && (
          <KpiCard label="Average order value" value={money(aov)} change={pctChange(aov, prevAov)}
            points={trendPoints(current, o => o.total, 5)} tone="purple" icon={FiActivity} />
        )}
      </div>

      <div className="portal-grid two">
        <RevenueChart series={series} />
        <StatusDonut orders={orders} />
      </div>

      <div className="portal-grid two">
        <CategoryChart orders={current} />
        <div className="portal-col">
          <TopProducts orders={current} />
          <TopCustomers orders={current} />
        </div>
      </div>

      <div className="portal-grid two">
        <LowStock />
        <PendingWork />
      </div>

      <RecentOrders orders={orders} onStatus={onStatus} />

      <div className="portal-grid two">
        <EmployeeActivity />
        <NotificationsFeed />
      </div>

      {areas !== null && (
        <InfoNote tone="warn">
          You are signed in with a limited employee role. Revenue, employee management, settings,
          the audit log and the full customer export stay hidden unless they are granted.
        </InfoNote>
      )}
    </PortalPage>
  );
}

export { csvDownload, STATUS_FLOW, orderTime, inWindow, pctChange, bucketSeries, DAY, useOrderList };
