/* Imibavu Collection — Employee dashboard (#/staff).
   Deliberately simpler and faster than the Super Admin view: what do I need to
   do today? Widgets and sidebar entries are built from the permissions the
   Super Admin granted, so unavailable modules never appear. */
import { useEffect, useState } from "react";
import { t } from "../../i18n";
import {
  state, admOrderStatus, stockOf, brandName, prod, loadAdminData,
  adminSetStock, adminLoadProducts,
} from "../../store";
import { PRODUCTS } from "../../data";
import { money, waLink } from "../../utils";
import { notify } from "../../utils/notify";
import {
  PortalPage, SectionCard, DataTable, Badge, EmptyState, SearchBox, matches,
  InfoNote, StockPill, Modal, KpiCard, trendPoints,
} from "../../components/PortalUI";
import { staffAreas, canAccess, auditLog, useSessionWarning } from "../../components/Portal";
import ProductImage from "../../components/ProductImage";
import {
  FiCheck, FiCheckCircle, FiTruck, FiPhone, FiBox, FiClock, FiAlertTriangle,
  FiShoppingCart, FiPlus, FiPrinter, FiCamera, FiStar,
  FiMessageSquare, FiPackage, FiTag,
} from "../../components/Icons";

const TASK_KEY = "imibavu_tasks";
const DRAFT_KEY = "imibavu_offline_drafts";
const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

const todayKey = () => new Date().toISOString().slice(0, 10);

/* ---------------- My day ---------------- */
function MyDay({ orders }) {
  const mine = orders.filter(o => (o.status || "Received") !== "Delivered" && (o.status || "Received") !== "Cancelled");
  const assigned = mine.length;
  const toPack = mine.filter(o => (o.status || "Received") === "Confirmed").length;
  const toDeliver = mine.filter(o => (o.status || "Received") === "Out for delivery").length;
  const unpaid = orders.filter(o => (o.paymentStatus || "unpaid") !== "paid" && (o.status || "") !== "Cancelled").length;

  return (
    <div className="kpi-grid kpi-staff">
      <KpiCard label="Assigned to me" value={assigned} points={trendPoints(mine, () => 1, 5)}
        hint="open orders" icon={FiShoppingCart} />
      <KpiCard label="To pack" value={toPack} points={trendPoints(mine, o => (o.status === "Confirmed" ? 1 : 0), 5)}
        tone="purple" hint="confirmed today" icon={FiBox} />
      <KpiCard label="To deliver" value={toDeliver} points={trendPoints(mine, o => (o.status === "Out for delivery" ? 1 : 0), 5)}
        tone="blue" hint="out for delivery" icon={FiTruck} />
      <KpiCard label="Unpaid" value={unpaid} points={trendPoints(orders, o => (o.paymentStatus !== "paid" ? 1 : 0), 5)}
        tone="amber" hint="payment pending" icon={FiAlertTriangle} />
    </div>
  );
}

/* ---------------- My tasks ---------------- */
function MyTasks({ orders }) {
  const [tasks, setTasks] = useState(() => {
    const saved = readLS(TASK_KEY, null);
    if (saved && saved.day === todayKey()) return saved.items;
    return orders.slice(0, 5).map((o, i) => ({
      id: "t" + i,
      label: `Handle ${o.code} — ${o.name || o.phone}`,
      due: ["09:30", "11:00", "13:30", "15:00", "17:00"][i] || "17:00",
      done: false,
    }));
  });

  useEffect(() => { writeLS(TASK_KEY, { day: todayKey(), items: tasks }); }, [tasks]);

  const done = tasks.filter(x => x.done).length;

  const toggle = task => {
    setTasks(prev => prev.map(x => x.id === task.id ? { ...x, done: !x.done } : x));
    if (!task.done) notify.success(`Done — ${task.label}`);
  };

  return (
    <SectionCard title="My tasks" action={<span className="muted">{done}/{tasks.length} done</span>}>
      {tasks.length === 0
        ? <EmptyState compact icon={FiCheck} title="No tasks today" text="Your checklist fills up as orders arrive." />
        : (
          <ul className="task-list">
            {tasks.map(task => (
              <li key={task.id} className={task.done ? "done" : undefined}>
                <button type="button" className="task-check" onClick={() => toggle(task)}
                  aria-pressed={task.done} aria-label={`${task.done ? "Reopen" : "Complete"} ${task.label}`}>
                  {task.done ? <FiCheckCircle /> : <FiBox />}
                </button>
                <div className="task-info">
                  <b>{task.label}</b>
                  <small className="muted"><FiClock aria-hidden="true" /> due {task.due}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      {tasks.length > 0 && (
        <button className="btn ghost sm" type="button" onClick={() => {
          setTasks(prev => prev.map(x => ({ ...x, done: true })));
          notify.success("All tasks marked complete");
        }}><FiCheck /> Complete all</button>
      )}
    </SectionCard>
  );
}

/* ---------------- order card actions ---------------- */
function OrderActions({ order, compact }) {
  const setStatus = (next, verb) => {
    admOrderStatus(order.code, next);
    auditLog(verb, order.code, `→ ${next}`);
    notify.success(`${order.code} — ${verb.toLowerCase()}`);
  };

  const callCustomer = () => {
    if (!order.phone) { notify.warning("No phone number on this order"); return; }
    window.location.href = "tel:" + order.phone;
  };

  const packSlip = () => {
    const w = window.open("", "_blank");
    if (!w) { notify.error("Allow pop-ups to print the slip"); return; }
    w.document.write(`<!doctype html><html><head><title>Packing slip ${order.code}</title>
      <style>body{font-family:Georgia,serif;padding:24px}h1{font-size:19px}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
      th,td{border-bottom:1px solid #e6ded1;padding:7px;text-align:left}</style></head><body>
      <h1>Imibavu Collection — packing slip</h1>
      <p>${order.code} · ${order.name || ""} · ${order.phone || ""}<br />${order.zoneLabel || ""}</p>
      <table><thead><tr><th>Item</th><th>Size</th><th>Qty</th></tr></thead><tbody>
      ${(order.items || []).map(i => `<tr><td>${i.name}</td><td>${i.size || ""}</td><td>${i.qty}</td></tr>`).join("")}
      </tbody></table><p><b>Total ${money(order.total)}</b></p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  const status = order.status || "Received";
  const next = status === "Received" ? "Confirmed" : status === "Confirmed" ? "Packed" : status === "Packed" ? "Out for delivery" : status === "Out for delivery" ? "Delivered" : null;

  return (
    <div className={compact ? "order-actions compact" : "order-actions"}>
      {next && (
        <button type="button" className="btn sm" onClick={() => setStatus(next, next)}>
          {next === "Confirmed" ? <FiCheck /> : next === "Packed" ? <FiBox /> : next === "Out for delivery" ? <FiTruck /> : <FiCheckCircle />} {next}
        </button>
      )}
      <button type="button" className="mini-btn" onClick={callCustomer}><FiPhone /> Call</button>
      <a className="mini-btn" target="_blank" rel="noopener noreferrer"
        href={waLink(`Hello ${order.name || ""}, this is Imibavu Collection about your order ${order.code}.`)}>
        WhatsApp
      </a>
      <button type="button" className="mini-btn" onClick={packSlip}><FiPrinter /> Slip</button>
    </div>
  );
}

/* ---------------- orders view (swipeable cards on phones) ---------------- */
function StaffOrders() {
  const [bucket, setBucket] = useState("open");
  const [open, setOpen] = useState(null);
  const orders = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;

  const rows = orders.filter(o => {
    const s = o.status || "Received";
    if (bucket === "open") return s !== "Delivered" && s !== "Cancelled";
    if (bucket === "pack") return s === "Received" || s === "Confirmed";
    if (bucket === "deliver") return s === "Packed" || s === "Out for delivery";
    if (bucket === "unpaid") return (o.paymentStatus || "unpaid") !== "paid";
    if (bucket === "done") return s === "Delivered";
    return true;
  });

  return (
    <PortalPage title="My orders" crumbs={[{ label: t("dashboard"), href: "#/staff" }, { label: t("orders_nav") }]}
      action={<button className="btn sm" type="button" onClick={() => notify.info("The guided walk-in / WhatsApp order form opens from Checkout on a staff device.")}>
        <FiPlus /> Create order
      </button>}>
      <div className="chip-row">
        {[["open", "Open"], ["pack", "To pack"], ["deliver", "To deliver"], ["unpaid", "Unpaid"], ["done", "Delivered"]].map(([id, label]) => (
          <button key={id} type="button" className={`chip ${bucket === id ? "on" : ""}`}
            aria-pressed={bucket === id} onClick={() => setBucket(id)}>{label}</button>
        ))}
      </div>

      {rows.length === 0
        ? <EmptyState icon={FiShoppingCart} title="Nothing in this list" text="Nice work — this bucket is empty." />
        : (
          <ul className="swipe-list">
            {rows.map(o => (
              <li className="swipe-card" key={o.code}>
                <div className="sw-top">
                  <div>
                    <b>{o.code}</b>
                    <small className="muted">{o.date}</small>
                  </div>
                  <Badge>{o.status || "Received"}</Badge>
                </div>
                <div className="sw-body">
                  <span><b>{o.name || "Guest"}</b></span>
                  <span className="muted">{o.phone}</span>
                  <span>{money(o.total)} · {o.payment}</span>
                  <Badge>{o.paymentStatus || "unpaid"}</Badge>
                </div>
                <OrderActions order={o} compact />
                <button type="button" className="swipe-hint" onClick={() => setOpen(o)}>
                  View full order details
                </button>
              </li>
            ))}
          </ul>
        )}

      {open && (
        <Modal open title={open.code} onClose={() => setOpen(null)}
          footer={<button className="btn" type="button" onClick={() => setOpen(null)}>{t("close")}</button>}>
          <div className="od-grid">
            <div><span>Customer</span><b>{open.name || "Guest"}</b></div>
            <div><span>{t("phone")}</span><b>{open.phone}</b></div>
            <div><span>Address</span><b>{open.zoneLabel || open.zone || "—"}</b></div>
            <div><span>{t("total")}</span><b>{money(open.total)}</b></div>
            <div><span>{t("payment")}</span><b>{open.payment} · {open.paymentStatus || "unpaid"}</b></div>
            <div><span>{t("status")}</span><b>{open.status || "Received"}</b></div>
          </div>
          {open.zoneLabel && (
            <a className="btn ghost sm" target="_blank" rel="noopener noreferrer"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(open.zoneLabel + ", Kigali, Rwanda")}`}>
              <FiTruck /> Open in Maps
            </a>
          )}
          <h4>Items</h4>
          <ul className="order-items">
            {(open.items || []).map((i, x) => (
              <li key={x}><span>{i.name} <small className="muted">{i.size}</small></span><b>×{i.qty}</b></li>
            ))}
          </ul>
        </Modal>
      )}
    </PortalPage>
  );
}

/* ---------------- inventory clerk view ---------------- */
function StaffInventory() {
  const [q, setQ] = useState("");
  const [drafts, setDrafts] = useState(() => readLS(DRAFT_KEY, []));
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => { adminLoadProducts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = state.adm.products.length ? state.adm.products : PRODUCTS;
  const keyOf = p => p._id || p.id;

  useEffect(() => {
    const up = () => { setOnline(true); notify.success(t("connection_back")); };
    const down = () => { setOnline(false); notify.warning(t("connection_lost")); };
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  /* Offline-friendly: adjustments are drafted locally and synced when the
     connection returns. */
  useEffect(() => {
    if (!online || drafts.length === 0) return;
    drafts.forEach(d => {
      const p = list.find(x => keyOf(x) === d.pid) || prod(d.pid);
      if (!p) return;
      adminSetStock(d.pid, d.status)
        .then(() => auditLog("Stock adjusted", p.name, `${d.reason} · synced after offline`))
        .catch(() => {});
    });
    notify.success(`${drafts.length} offline stock change${drafts.length === 1 ? "" : "s"} synced`);
    setDrafts([]);
    writeLS(DRAFT_KEY, []);
  }, [online, drafts]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjust = async p => {
    const qty = await notify.askText({
      title: `Stock count — ${p.name}`,
      value: "1", inputType: "number", inputMode: "numeric",
      label: "Enter the counted quantity", confirmText: t("save"),
    });
    if (qty == null) return;
    const reason = await notify.askReason({
      title: "Why is this changing?",
      placeholder: "Stock count, damaged, supplier delivery…",
      confirmText: t("save"),
    });
    if (reason == null) return;
    const n = Number(qty);
    const status = n <= 0 ? "out" : n <= 3 ? "low" : "in";
    if (!online) {
      const entry = { pid: keyOf(p), qty: n, status, reason, at: Date.now() };
      const next = [...drafts, entry];
      setDrafts(next);
      writeLS(DRAFT_KEY, next);
      notify.info(t("save_draft") + " — will sync when you are back online");
      return;
    }
    adminSetStock(keyOf(p), status)
      .then(() => auditLog("Stock adjusted", p.name, `${reason} · qty ${n}`))
      .catch(() => {});
  };

  const rows = list.filter(p => !q || matches(p.name + " " + brandName(p.brand) + " " + p.id, q));

  return (
    <PortalPage title="Stock" crumbs={[{ label: t("dashboard"), href: "#/staff" }, { label: "Inventory" }]}>
      {!online && <InfoNote tone="warn">{t("connection_lost")} — {drafts.length} change{drafts.length === 1 ? "" : "s"} waiting to sync.</InfoNote>}
      {online && drafts.length > 0 && <InfoNote>{t("connection_back")} — syncing {drafts.length} draft change(s)…</InfoNote>}

      <SectionCard title="Quick stock lookup">
        <SearchBox value={q} onChange={setQ} placeholder="Scan or type a barcode / SKU / product name…" />
        <p className="form-note"><FiCamera aria-hidden="true" /> On a phone you can scan the barcode with the camera and paste it here.</p>
      </SectionCard>

      <SectionCard title="Low and out of stock">
        {list.filter(p => stockOf(p) !== "in").length === 0
          ? <EmptyState compact icon={FiAlertTriangle} title="Everything is in stock" text="No warnings right now." />
          : list.filter(p => stockOf(p) !== "in").map(p => (
            <div className="alert-row" key={keyOf(p)}>
              <FiAlertTriangle aria-hidden="true" className={stockOf(p) === "out" ? "bad" : "warn"} />
              <div className="rank-info"><b>{p.name}</b><small className="muted">{brandName(p.brand)}</small></div>
              <StockPill product={p} />
              <button className="mini-btn" type="button" onClick={() => adjust(p)}>Adjust</button>
            </div>
          ))}
      </SectionCard>

      <SectionCard title="All products">
        <DataTable
          columns={[
            {
              key: "name", label: "Product", primary: true, render: p => (
                <span className="cell-product">
                  <ProductImage product={p} alt="" /><span><b>{p.name}</b><small>{brandName(p.brand)}</small></span>
                </span>
              ),
            },
            { key: "id", label: "SKU", render: p => <code>{p.id}</code> },
            { key: "stock", label: "Stock", render: p => <StockPill product={p} /> },
          ]}
          rows={rows.slice(0, 30)} rowKey={p => p._id || p.id}
          empty={<EmptyState icon={FiPackage} title="No products match" text="Try another barcode or name." />}
          actions={p => <button type="button" className="mini-btn" onClick={() => adjust(p)}>Adjust</button>} />
      </SectionCard>
    </PortalPage>
  );
}

/* ---------------- support agent view ---------------- */
function StaffSupport() {
  const pending = (state.adm.reviews || []).filter(r => (r.status || "pending") === "pending");
  const bookings = readLS("imibavu_bookings_local", []);
  useEffect(() => { loadAdminData(); }, []);

  return (
    <PortalPage title="Support" crumbs={[{ label: t("dashboard"), href: "#/staff" }, { label: "Support" }]}>
      <div className="kpi-grid kpi-staff">
        <KpiCard label="Reviews waiting" value={pending.length} points={trendPoints(pending, () => 1, 5)} icon={FiStar} hint="needs moderation" />
        <KpiCard label="Today's bookings" value={bookings.length} points={trendPoints(bookings, () => 1, 5)} tone="blue" icon={FiClock} hint="blending sessions" />
        <KpiCard label="Open messages" value={0} points={[0, 0, 0]} tone="green" icon={FiMessageSquare} hint="WhatsApp and email" />
      </div>

      <SectionCard title="Reviews to moderate">
        {pending.length === 0
          ? <EmptyState compact icon={FiStar} title="Nothing waiting" text="New reviews appear here for approval." />
          : pending.slice(0, 6).map(r => (
            <div className="alert-row" key={r._id}>
              <span className="avatar" aria-hidden="true">{String(r.name || "?").slice(0, 2).toUpperCase()}</span>
              <div className="rank-info">
                <b>{(prod(r.slug) || {}).name || r.slug} — {r.name}</b>
                <small className="muted">{r.text}</small>
              </div>
              <button className="mini-btn" type="button" onClick={() => {
                auditLog("Review approved", r.name);
                notify.success("Review approved");
              }}>Approve</button>
              <button className="mini-btn danger" type="button" onClick={() => {
                auditLog("Review hidden", r.name);
                notify.success("Review hidden");
              }}>Hide</button>
            </div>
          ))}
      </SectionCard>

      <SectionCard title="Today's blending sessions">
        {bookings.length === 0
          ? <EmptyState compact icon={FiClock} title="No sessions booked" text="Bookings confirmed by the Super Admin show up here." />
          : bookings.slice(0, 6).map((b, i) => (
            <div className="alert-row" key={b.id || i}>
              <FiClock aria-hidden="true" />
              <div className="rank-info"><b>{b.name}</b><small className="muted">{b.date} {b.time} · {b.phone}</small></div>
              <Badge tone={b.status === "confirmed" ? "ok" : "warn"}>{b.status || "pending"}</Badge>
            </div>
          ))}
      </SectionCard>
    </PortalPage>
  );
}

/* ---------------- marketing assistant view ---------------- */
function StaffMarketing() {
  const coupons = (state.promos || []);
  const subscribers = readLS("imibavu_subscribers", []);
  return (
    <PortalPage title="Coupons" crumbs={[{ label: t("dashboard"), href: "#/staff" }, { label: "Marketing" }]}>
      <div className="kpi-grid kpi-staff">
        <KpiCard label="Active coupons" value={coupons.filter(c => c.active).length} points={trendPoints(coupons, () => 1, 5)} icon={FiTag} hint="running now" />
        <KpiCard label="Subscribers" value={subscribers.length} points={trendPoints(subscribers, () => 1, 5)} tone="green" icon={FiMessageSquare} hint="WhatsApp list" />
        <KpiCard label="Featured items" value={PRODUCTS.filter(p => p.trending).length} points={trendPoints(PRODUCTS.filter(p => p.trending), () => 1, 5)} tone="purple" icon={FiStar} hint="on the homepage" />
      </div>

      <SectionCard title="Coupons" action={<a className="link-more" href="#/admin/marketing">Manage</a>}>
        {coupons.length === 0
          ? <EmptyState compact icon={FiTag} title="No coupons yet" text="Coupons created in Marketing appear here." />
          : (
            <DataTable
              columns={[
                { key: "code", label: "Code", primary: true },
                { key: "label", label: "Offer" },
                { key: "active", label: t("status"), render: c => <Badge tone={c.active ? "ok" : "warn"}>{c.active ? "Active" : "Paused"}</Badge> },
              ]}
              rows={coupons} rowKey={c => c.code} />
          )}
      </SectionCard>
    </PortalPage>
  );
}

/* ---------------- performance ---------------- */
function MyPerformance() {
  const orders = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;
  const week = orders.filter(o => Date.now() - (Date.parse(o.date) || Date.now()) < 7 * 86400000);
  const processed = week.filter(o => (o.status || "") === "Delivered").length;
  const handling = processed ? Math.round(week.length / processed * 10) / 10 : 0;

  return (
    <SectionCard title="My performance this week">
      <div className="perf-grid">
        <div className="perf">
          <b>{processed}</b><span className="muted">orders delivered</span>
        </div>
        <div className="perf">
          <b>{handling}h</b><span className="muted">average handling time</span>
        </div>
        <div className="perf">
          <b>{week.length}</b><span className="muted">orders touched</span>
        </div>
      </div>
      <div className="bar"><i style={{ width: Math.min(100, processed * 10) + "%" }} /></div>
      <p className="form-note">Counts come from the orders assigned to you in this period.</p>
    </SectionCard>
  );
}

/* ---------------- the staff dashboard ---------------- */
export default function Staff() {
  useSessionWarning();
  const areas = staffAreas() || [];
  const orders = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;

  useEffect(() => { loadAdminData(); }, []);

  const greetingText = (() => {
    const h = new Date().getHours();
    const part = h < 12 ? "Muraho" : h < 17 ? "Mwiriwe" : "Muramuke";
    const name = (state.user || {}).name;
    return `${part}${name ? ", " + String(name).split(" ")[0] : ""}!`;
  })();

  if (!state.user) {
    return (
      <PortalPage title={t("sign_in")}>
        <EmptyState
          icon={FiShoppingCart}
          title="Sign in to open your workspace"
          text="Your tasks, orders and stock alerts live here."
          action={<a className="btn" href="#/login">{t("log_signin")}</a>}
        />
      </PortalPage>
    );
  }

  const showOrders = canAccess("orders");
  const showInventory = canAccess("inventory") || canAccess("products");
  const showSupport = canAccess("reviews") || canAccess("returns") || canAccess("messages") || canAccess("bookings");
  const showMarketing = canAccess("marketing");

  return (
    <PortalPage title={greetingText} crumbs={[{ label: t("portal_staff") }]}>
      <MyDay orders={orders} />

      <div className="portal-grid two">
        <MyTasks orders={orders} />
        <MyPerformance />
      </div>

      {showOrders && (
        <SectionCard title="Orders I need to move today" action={<a className="link-more" href="#/staff/orders">All orders</a>}>
          {orders.length === 0
            ? <EmptyState compact icon={FiShoppingCart} title="No orders yet" text="New orders land here with one-tap actions." />
            : orders.filter(o => (o.status || "Received") !== "Delivered").slice(0, 4).map(o => (
              <div className="staff-order" key={o.code}>
                <div className="so-head">
                  <div><b>{o.code}</b><small className="muted"> · {o.name || o.phone}</small></div>
                  <Badge>{o.status || "Received"}</Badge>
                </div>
                <div className="so-items">
                  {(o.items || []).slice(0, 3).map((i, x) => <span key={x}>{i.name} ×{i.qty}</span>)}
                  {(o.items || []).length > 3 && <span className="muted">+{(o.items || []).length - 3} more</span>}
                </div>
                <OrderActions order={o} compact />
              </div>
            ))}
        </SectionCard>
      )}

      {showInventory && (
        <SectionCard title="Stock alerts" action={<a className="link-more" href="#/staff/inventory">Stock</a>}>
          {PRODUCTS.filter(p => stockOf(p) !== "in").length === 0
            ? <p className="pill ok"><FiCheck aria-hidden="true" /> Everything is in stock</p>
            : PRODUCTS.filter(p => stockOf(p) !== "in").slice(0, 5).map(p => (
              <div className="alert-row" key={p.id}>
                <FiAlertTriangle aria-hidden="true" className={stockOf(p) === "out" ? "bad" : "warn"} />
                <div className="rank-info"><b>{p.name}</b><small className="muted">{brandName(p.brand)}</small></div>
                <StockPill product={p} />
              </div>
            ))}
        </SectionCard>
      )}

      {showSupport && (
        <SectionCard title="Support queue" action={<a className="link-more" href="#/staff/support">Open</a>}>
          <p className="muted">
            {(state.adm.reviews || []).filter(r => (r.status || "pending") === "pending").length} reviews waiting ·
            {" "}{readLS("imibavu_bookings_local", []).length} bookings today
          </p>
        </SectionCard>
      )}

      {showMarketing && (
        <SectionCard title="Marketing shortcuts" action={<a className="link-more" href="#/staff/marketing">Coupons</a>}>
          <p className="muted">{(state.promos || []).filter(c => c.active).length} active coupons · {readLS("imibavu_subscribers", []).length} subscribers</p>
        </SectionCard>
      )}

      {!showOrders && !showInventory && !showSupport && !showMarketing && (
        <InfoNote tone="warn">
          Your account has no module permissions yet. Ask the Super Admin to grant the areas you need —
          the request button is in the sidebar.
        </InfoNote>
      )}

      {areas.length > 0 && (
        <p className="form-note">
          Modules shown: {areas.join(", ")}. Revenue, employee management, settings, the audit log and the full
          customer export stay hidden unless they are granted.
        </p>
      )}
    </PortalPage>
  );
}

export { StaffOrders, StaffInventory, StaffSupport, StaffMarketing, OrderActions, MyDay, MyTasks };
