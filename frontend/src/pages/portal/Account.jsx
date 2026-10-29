/* Imibavu Collection — Customer dashboard (#/account).
   A warm, elegant account area inside the storefront: order tracker, wishlist
   with restock alerts, loyalty and coupons, Scent Finder profile, bookings,
   referrals and full security/privacy controls. Mobile-first. */
import { useEffect, useMemo, useState } from "react";
import { t } from "../../i18n";
import {
  state, prod, brandName, addToCart, toggleWish, blendLoad,
  blendDel, loadLoyalty, logout, payForOrder, fetchOrder, go, setLang,
  disableMfa,
} from "../../store";
import { PRODUCTS } from "../../data";
import { money, waLink } from "../../utils";
import { notify } from "../../utils/notify";
import {
  PortalPage, SectionCard, Badge, EmptyState, Modal, InfoNote,
  KpiCard, trendPoints,
} from "../../components/PortalUI";
import { CustomerMenu } from "../../components/Portal";
import ProductImage from "../../components/ProductImage";
import {
  FiShoppingBag, FiHeart, FiAward, FiTruck, FiRepeat, FiMapPin, FiStar,
  FiCalendar, FiLock, FiCheck, FiPlus, FiTrash2, FiDownload,
  FiPackage, FiSmartphone, FiPercent, FiRefreshCw,
} from "../../components/Icons";

const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

const STEPS = ["Placed", "Confirmed", "Packed", "Out for delivery", "Delivered"];
const stepIndex = status => {
  const s = String(status || "Received").toLowerCase();
  if (s === "cancelled" || s === "refunded") return -1;
  if (s === "received") return 0;
  if (s === "confirmed") return 1;
  if (s === "packed") return 2;
  if (s === "out for delivery") return 3;
  if (s === "delivered") return 4;
  return 0;
};

/* Kigali districts and sectors for the address selector. */
const KIGALI = {
  Gasabo: ["Kacyiru", "Remera", "Kimironko", "Gisozi", "Nyarutarama", "Kimihurura"],
  Kicukiro: ["Niboye", "Kagarama", "Gikondo", "Kanombe", "Gatenga"],
  Nyarugenge: ["Nyamirambo", "Muhima", "Kimisagara", "Gitega", "Nyakabanda"],
};

/* ---------------- order tracker ---------------- */
function OrderTracker({ order, compact }) {
  const idx = stepIndex(order.status);
  const cancelled = idx === -1;
  return (
    <div className={compact ? "tracker compact" : "tracker"}>
      <ol aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s} className={cancelled ? "cancelled" : i < idx ? "done" : i === idx ? "on" : ""}>
            <i aria-hidden="true">{i < idx ? <FiCheck /> : i + 1}</i>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      {cancelled && <p className="pill bad">This order was {String(order.status).toLowerCase()}.</p>}
    </div>
  );
}

/* ---------------- dashboard ---------------- */
function CustomerHome() {
  const orders = state.orders || [];
  const latest = orders[0];
  const wish = state.wish.map(prod).filter(Boolean);
  const ly = state.loyalty;
  const alerts = readLS("imibavu_alerts", []);
  const restocked = alerts.filter(a => {
    const p = prod(a.id);
    return p && p.stock !== "out";
  }).length;
  const coupons = (state.promos || []).filter(c => c.active);
  const bookings = readLS("imibavu_bookings_local", []);
  const nextBooking = bookings.find(b => new Date(b.date || Date.now()) >= new Date(Date.now() - 86400000));
  const quiz = state.quiz && state.quiz.a;
  const hasQuiz = quiz && (quiz.mood || (quiz.notes || []).length);
  const referral = "IMB-" + String((state.user || {}).phone || "GUEST").replace(/\D/g, "").slice(-5);

  useEffect(() => { if (!ly) loadLoyalty(); }, [ly]);

  const recommended = useMemo(() => {
    const bought = new Set();
    orders.forEach(o => (o.items || []).forEach(i => bought.add(i.slug || i.name)));
    const families = new Set();
    orders.forEach(o => (o.items || []).forEach(i => {
      const p = PRODUCTS.find(x => x.slug === i.slug || x.name === i.name);
      if (p) families.add(p.family);
    }));
    if (quiz && quiz.mood === "oud") families.add("Oud");
    if (quiz && quiz.mood === "fresh") families.add("Fresh");
    const pool = PRODUCTS.filter(p => !bought.has(p.id) && (families.size === 0 || families.has(p.family)));
    return (pool.length ? pool : PRODUCTS).slice(0, 4);
  }, [orders, quiz]);

  return (
    <>
      <div className="acc-greeting">
        <h1>{(() => {
          const h = new Date().getHours();
          const name = (state.user || {}).name;
          return `${h < 12 ? "Muraho" : h < 17 ? "Mwiriwe" : "Muramuke"}${name ? ", " + String(name).split(" ")[0] : ""}!`;
        })()}</h1>
        <p className="muted">Here is everything about your orders, blends and rewards.</p>
      </div>

      <div className="kpi-grid kpi-swipe">
        <KpiCard label={t("orders_nav")} value={orders.length} points={trendPoints(orders, () => 1, 5)}
          href="#/account/orders" icon={FiShoppingBag} hint="all time" />
        <KpiCard label={t("wishlist_nav")} value={wish.length} points={trendPoints(wish, () => 1, 5)}
          tone="purple" href="#/account/wish" icon={FiHeart}
          hint={restocked ? `${restocked} back in stock` : "saved items"} />
        <KpiCard label="Loyalty points" value={ly ? ly.points : 0} points={trendPoints(ly && ly.history ? ly.history : [], h => h.points, 5)}
          tone="green" href="#/account/rewards" icon={FiAward}
          hint={ly ? `worth ${money((ly.points || 0) * (ly.pointValue || 1))}` : "sign in to earn"} />
        <KpiCard label="Coupons" value={coupons.length} points={trendPoints(coupons, () => 1, 5)}
          tone="amber" href="#/account/offers" icon={FiPercent}
          hint={coupons[0] ? `${coupons[0].code} • limited` : "no active coupons"} />
      </div>

      {latest ? (
        <SectionCard title="Latest order" action={<Badge>{latest.status || "Received"}</Badge>}>
          <div className="latest-order">
            <div className="lo-head">
              <div>
                <b>{latest.code}</b>
                <small className="muted"> · {latest.date} · {money(latest.total)}</small>
              </div>
              <Badge>{latest.paymentStatus || "unpaid"}</Badge>
            </div>
            <OrderTracker order={latest} />
            <div className="lo-actions">
              <a className="btn sm" href={"#/order/" + latest.code}><FiTruck /> Track order</a>
              <button className="btn ghost sm" type="button" onClick={() => {
                notify.info("Invoice opened — use your browser's print or save option");
                window.print();
              }}>Invoice</button>
              <button className="btn ghost sm" type="button" onClick={() => {
                (latest.items || []).forEach(i => {
                  const p = prod(i.slug) || PRODUCTS.find(x => x.name === i.name);
                  if (p) addToCart(p.id, 0, i.qty || 1);
                });
                notify.success("Items added back to your cart");
                go("#/checkout");
              }}><FiRepeat /> Reorder</button>
              {String(latest.paymentStatus || "") !== "paid" && (
                <button className="btn ghost sm" type="button" onClick={() => payForOrder(latest.code)}>Pay now</button>
              )}
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Latest order">
          <EmptyState icon={FiShoppingBag} title="No orders yet"
            text="Your first order will appear here with live progress."
            action={<a className="btn" href="#/shop">Start shopping</a>} />
        </SectionCard>
      )}

      <SectionCard title="Recommended for you" action={<a className="link-more" href="#/quiz">{t("quiz_title")}</a>}>
        <div className="reco-row">
          {recommended.map(p => (
            <div className="reco-card" key={p.id}>
              <a href={"#/product/" + p.id}><ProductImage product={p} alt={p.name} loading="lazy" /></a>
              <b>{p.name}</b>
              <small className="muted">{brandName(p.brand)}</small>
              <span>{money(p.price)}</span>
              <button className="mini-btn" type="button" onClick={() => addToCart(p.id)}>{t("add_cart")}</button>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="portal-grid two">
        <SectionCard title="Upcoming booking">
          {nextBooking ? (
            <>
              <div className="od-grid">
                <div><span>When</span><b>{nextBooking.date} {nextBooking.time}</b></div>
                <div><span>{t("status")}</span><b>{nextBooking.status || "pending"}</b></div>
                <div><span>{t("phone")}</span><b>{nextBooking.phone}</b></div>
              </div>
              <div className="row-btns">
                <button className="btn ghost sm" type="button" onClick={async () => {
                  const when = await notify.askText({
                    title: "Reschedule your session",
                    placeholder: "2026-03-04 15:30",
                    label: "Give a new date and time",
                  });
                  if (when == null) return;
                  writeLS("imibavu_bookings_local", bookings.map(b => b === nextBooking ? { ...b, date: when, status: "reschedule requested" } : b));
                  notify.success(`Reschedule requested for ${when}`);
                }}>Reschedule</button>
                <button className="btn ghost sm danger" type="button" onClick={async () => {
                  const ok = await notify.confirm({
                    title: "Cancel this blending session?",
                    text: `${nextBooking.date} ${nextBooking.time} — this frees the slot for someone else.`,
                    confirmText: "Cancel session", cancelText: "Keep it", danger: true,
                  });
                  if (!ok) return;
                  writeLS("imibavu_bookings_local", bookings.filter(b => b !== nextBooking));
                  notify.success("Session cancelled");
                }}>Cancel</button>
              </div>
            </>
          ) : (
            <EmptyState compact icon={FiCalendar} title="No booking yet"
              text="Book an in-store blending session and we will mix your scent while you wait."
              action={<a className="btn ghost sm" href="#/blends?book=1">{t("book_session")}</a>} />
          )}
        </SectionCard>

        <SectionCard title="Your Scent Finder profile">
          {hasQuiz ? (
            <>
              <div className="scent-profile">
                <span className="pill info">{quiz.mood || "—"}</span>
                <span className="pill">{quiz.season || "—"}</span>
                {(quiz.notes || []).map(n => <span className="pill" key={n}>{n}</span>)}
              </div>
              <div className="row-btns">
                <a className="btn ghost sm" href="#/quiz"><FiRefreshCw /> Retake quiz</a>
                <button className="btn sm" type="button" onClick={() => go("#/quiz")}>See matches</button>
              </div>
            </>
          ) : (
            <EmptyState compact icon={FiStar} title="No scent profile yet"
              text="Answer three quick questions and we will match your fragrance."
              action={<a className="btn" href="#/quiz">Take the quiz</a>} />
          )}
        </SectionCard>
      </div>

      <div className="portal-grid two">
        <SectionCard title="Coupons wallet" action={<a className="link-more" href="#/account/offers">Offers</a>}>
          {coupons.length === 0
            ? <EmptyState compact icon={FiPercent} title="No coupons right now" text="Watch this space for seasonal offers." />
            : coupons.map(c => (
              <div className="alert-row" key={c.code}>
                <FiPercent aria-hidden="true" />
                <div className="rank-info"><b>{c.code}</b><small className="muted">{c.label}</small></div>
                <button className="mini-btn" type="button" onClick={async () => {
                  const ok = await notify.confirm({
                    title: `Use coupon ${c.code}?`,
                    text: "We will apply it at checkout for you.",
                    confirmText: "Apply", cancelText: t("cancel"),
                  });
                  if (!ok) return;
                  notify.success(`${c.code} will be applied at checkout`);
                  go("#/checkout");
                }}>Use</button>
              </div>
            ))}
        </SectionCard>

        <SectionCard title="Refer a friend">
          <p className="muted">Share your code — your friend gets a welcome offer and you earn loyalty points when they order.</p>
          <div className="referral-box">
            <code>{referral}</code>
            <button className="mini-btn" type="button" onClick={async () => {
              const ok = await notify.confirm({
                title: "Copy your referral code?",
                text: `Share ${referral} with a friend.`,
                confirmText: "Copy", cancelText: t("cancel"),
              });
              if (!ok) return;
              try { await navigator.clipboard.writeText(referral); notify.success("Referral code copied"); }
              catch (e) { notify.info(referral); }
            }}>Copy</button>
            <a className="mini-btn" target="_blank" rel="noopener noreferrer"
              href={waLink(`Try Imibavu Collection with my code ${referral} — perfumes, oils and custom blends in downtown Kigali.`)}>
              WhatsApp
            </a>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

/* ---------------- orders ---------------- */
function CustomerOrders() {
  const [filter, setFilter] = useState("all");
  const orders = state.orders || [];
  const rows = orders.filter(o => {
    const s = (o.status || "Received").toLowerCase();
    if (filter === "open") return !["delivered", "cancelled"].includes(s);
    if (filter === "delivered") return s === "delivered";
    if (filter === "cancelled") return ["cancelled", "refunded"].includes(s);
    return true;
  });

  return (
    <>
      <div className="chip-row">
        {[["all", "All"], ["open", "In progress"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]].map(([id, label]) => (
          <button key={id} type="button" className={`chip ${filter === id ? "on" : ""}`}
            aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>

      {rows.length === 0
        ? <EmptyState icon={FiShoppingBag} title="Nothing here" text="Orders you place will show up in this list."
            action={<a className="btn" href="#/shop">{t("back_shop")}</a>} />
        : rows.map(o => {
          const s = (o.status || "Received").toLowerCase();
          const canCancel = !["delivered", "out for delivery", "cancelled", "refunded"].includes(s);
          return (
            <SectionCard key={o.code} title={o.code}
              action={<Badge>{o.status || "Received"}</Badge>}>
              <p className="muted">{o.date} · {(o.items || []).length} items · {money(o.total)} · {o.payment}</p>
              <OrderTracker order={o} />
              <div className="row-btns">
                <a className="mini-btn" href={"#/order/" + o.code}>Track</a>
                {(o.items || []).length > 0 && (
                  <button className="mini-btn" type="button" onClick={() => {
                    (o.items || []).forEach(i => {
                      const p = prod(i.slug) || PRODUCTS.find(x => x.name === i.name);
                      if (p) addToCart(p.id, 0, i.qty || 1);
                    });
                    notify.success("Added back to your cart");
                  }}>{t("reorder")}</button>
                )}
                <button className="mini-btn" type="button" onClick={() => {
                  notify.info("Invoice ready — use your browser to save or print");
                  window.print();
                }}>Invoice</button>
                {String(o.paymentStatus || "") !== "paid" && (
                  <button className="mini-btn" type="button" onClick={() => payForOrder(o.code)}>Pay now</button>
                )}
                {canCancel && (
                  <button className="mini-btn danger" type="button" onClick={async () => {
                    const reason = await notify.askReason({
                      title: `Cancel order ${o.code}?`,
                      placeholder: "Why are you cancelling?",
                      confirmText: "Cancel order",
                    });
                    if (reason == null) return;
                    o.status = "Cancelled";
                    writeLS("imibavu_orders", state.orders);
                    notify.result({
                      icon: "success",
                      title: "Order cancelled",
                      html: `<b>${o.code}</b> is cancelled.<br /><small>${reason}</small>`,
                      confirmText: t("close"),
                    });
                  }}>Cancel</button>
                )}
              </div>
              {o.zoneLabel && (
                <a className="mini-btn" target="_blank" rel="noopener noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.zoneLabel + ", Kigali")}`}>
                  <FiMapPin /> Delivery address
                </a>
              )}
            </SectionCard>
          );
        })}
    </>
  );
}

/* ---------------- wishlist ---------------- */
function CustomerWishlist() {
  const alerts = readLS("imibavu_alerts", []);
  const items = state.wish.map(prod).filter(Boolean);
  return (
    <>
      {alerts.length > 0 && (
        <InfoNote>
          {alerts.length} item{alerts.length === 1 ? "" : "s"} on your back-in-stock list. We message you on
          WhatsApp the moment stock returns.
        </InfoNote>
      )}
      {items.length === 0
        ? <EmptyState icon={FiHeart} title="Your wishlist is empty" text="Tap the heart on any product to save it here."
            action={<a className="btn" href="#/shop">{t("back_shop")}</a>} />
        : (
          <ul className="wish-list">
            {items.map(p => {
              const out = p.stock === "out";
              return (
                <li className="wish-row" key={p.id}>
                  <a href={"#/product/" + p.id}><ProductImage product={p} alt={p.name} loading="lazy" /></a>
                  <div className="wr-info">
                    <b>{p.name}</b>
                    <small className="muted">{brandName(p.brand)}</small>
                    <span>{money(p.price)}</span>
                    {out ? <Badge tone="bad">Out of stock</Badge> : <Badge tone="ok">In stock</Badge>}
                  </div>
                  <div className="wr-actions">
                    <button className="mini-btn" type="button" disabled={out}
                      onClick={() => addToCart(p.id)}>{out ? "Notify me" : t("add_cart")}</button>
                    {out && (
                      <button className="mini-btn" type="button" onClick={() => {
                        const next = [...alerts, { id: p.id, at: Date.now() }];
                        writeLS("imibavu_alerts", next);
                        notify.success("We will tell you when it is back");
                      }}>Back-in-stock alert</button>
                    )}
                    <button className="mini-btn danger" type="button" onClick={() => toggleWish(p.id)} aria-label="Remove">
                      <FiTrash2 />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </>
  );
}

/* ---------------- addresses ---------------- */
function CustomerAddresses() {
  const [list, setList] = useState(() => readLS("imibavu_addresses", []));
  const [editing, setEditing] = useState(null);

  const save = values => {
    const next = values.id
      ? list.map(a => a.id === values.id ? values : (values.def ? { ...a, def: false } : a))
      : [...(values.def ? list.map(a => ({ ...a, def: false })) : list), { ...values, id: "ad" + Date.now() }];
    setList(next);
    writeLS("imibavu_addresses", next);
    setEditing(null);
    notify.success(values.id ? "Address updated" : "Address added");
  };

  const remove = async a => {
    const ok = await notify.confirm({
      title: "Delete this address?",
      text: `${a.label} — ${a.sector}, ${a.district}`,
      confirmText: t("delete"), cancelText: t("cancel"), danger: true,
    });
    if (!ok) return;
    const next = list.filter(x => x.id !== a.id);
    setList(next);
    writeLS("imibavu_addresses", next);
    notify.success("Address deleted");
  };

  return (
    <>
      <div className="pp-actions">
        <button className="btn sm" type="button" onClick={() => setEditing({ district: "Gasabo", sector: "Kacyiru", def: list.length === 0 })}>
          <FiPlus /> Add address
        </button>
      </div>

      {list.length === 0
        ? <EmptyState icon={FiMapPin} title="No addresses saved" text="Add a delivery address so checkout is one tap."
            action={<button className="btn" type="button" onClick={() => setEditing({ district: "Gasabo", sector: "Kacyiru", def: true })}>Add address</button>} />
        : list.map(a => (
          <div className="addr-card" key={a.id}>
            <div className="ac-head">
              <b>{a.label || "Address"}</b>
              {a.def && <Badge tone="ok">Default</Badge>}
            </div>
            <p className="muted">{a.line}<br />{a.sector}, {a.district} · Kigali{a.phone ? ` · ${a.phone}` : ""}</p>
            <div className="row-btns">
              <button className="mini-btn" type="button" onClick={() => setEditing(a)}>{t("edit")}</button>
              {!a.def && (
                <button className="mini-btn" type="button" onClick={() => {
                  const next = list.map(x => ({ ...x, def: x.id === a.id }));
                  setList(next); writeLS("imibavu_addresses", next);
                  notify.success("Default address updated");
                }}>Make default</button>
              )}
              <button className="mini-btn danger" type="button" onClick={() => remove(a)}>{t("delete")}</button>
            </div>
          </div>
        ))}

      {editing && (
        <Modal open title={editing.id ? "Edit address" : "Add address"} onClose={() => setEditing(null)}
          footer={<>
            <button className="btn ghost" type="button" onClick={() => setEditing(null)}>{t("cancel")}</button>
            <button className="btn" type="button" onClick={() => {
              if (!editing.line || !editing.sector) { notify.warning("Add a street line and a sector"); return; }
              save(editing);
            }}>{t("save")}</button>
          </>}>
          <label className="field"><span>Label</span>
            <input value={editing.label || ""} placeholder="Home, Office…"
              onChange={e => setEditing({ ...editing, label: e.target.value })} /></label>
          <label className="field"><span>Street / landmark</span>
            <input value={editing.line || ""} placeholder="T2000 Building, ground floor"
              onChange={e => setEditing({ ...editing, line: e.target.value })} /></label>
          <div className="form-grid two">
            <label className="field"><span>District</span>
              <select value={editing.district} onChange={e => setEditing({ ...editing, district: e.target.value, sector: KIGALI[e.target.value][0] })}>
                {Object.keys(KIGALI).map(d => <option key={d} value={d}>{d}</option>)}
              </select></label>
            <label className="field"><span>Sector</span>
              <select value={editing.sector} onChange={e => setEditing({ ...editing, sector: e.target.value })}>
                {(KIGALI[editing.district] || []).map(s => <option key={s} value={s}>{s}</option>)}
              </select></label>
          </div>
          <label className="field"><span>{t("phone_num")}</span>
            <input inputMode="tel" value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} /></label>
          <label className="switch-row">
            <input type="checkbox" checked={!!editing.def} onChange={e => setEditing({ ...editing, def: e.target.checked })} />
            <span>Use as my default delivery address</span>
          </label>
        </Modal>
      )}
    </>
  );
}

/* ---------------- returns ---------------- */
function CustomerReturns() {
  const [list, setList] = useState(() => readLS("imibavu_returns", []));
  const [form, setForm] = useState(null);
  const orders = state.orders || [];

  const submit = () => {
    if (!form.order) { notify.warning("Choose the order you want to return"); return; }
    if (!form.reason) { notify.warning("Tell us why you are returning it"); return; }
    const entry = { id: "r" + Date.now(), at: Date.now(), status: "requested", ...form };
    const next = [entry, ...list];
    setList(next);
    writeLS("imibavu_returns", next);
    setForm(null);
    notify.result({
      icon: "success",
      title: "Return requested",
      html: `We will review <b>${entry.order}</b> and message you within one working day.`,
      confirmText: t("close"),
    });
  };

  return (
    <>
      <div className="pp-actions">
        <button className="btn sm" type="button" onClick={() => setForm({ order: orders[0] ? orders[0].code : "", reason: "", photos: [] })}>
          <FiPlus /> Request a return
        </button>
      </div>

      {list.length === 0
        ? <EmptyState icon={FiRepeat} title="No returns" text="If something is not right, start a return here and we will sort it out." />
        : list.map(r => (
          <div className="addr-card" key={r.id}>
            <div className="ac-head">
              <b>{r.order}</b>
              <Badge tone={r.status === "approved" ? "ok" : r.status === "rejected" ? "bad" : "warn"}>{r.status}</Badge>
            </div>
            <p className="muted">{r.reason}</p>
            <small className="muted">Requested {new Date(r.at).toLocaleDateString("en-GB")}{r.photos.length ? ` · ${r.photos.length} photo(s)` : ""}</small>
          </div>
        ))}

      {form && (
        <Modal open title="Request a return" onClose={() => setForm(null)}
          footer={<>
            <button className="btn ghost" type="button" onClick={() => setForm(null)}>{t("cancel")}</button>
            <button className="btn" type="button" onClick={submit}>Send request</button>
          </>}>
          <label className="field"><span>Which order?</span>
            <select value={form.order} onChange={e => setForm({ ...form, order: e.target.value })}>
              <option value="">Choose an order…</option>
              {orders.map(o => <option key={o.code} value={o.code}>{o.code} — {o.date}</option>)}
            </select></label>
          <label className="field"><span>Reason</span>
            <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
              <option value="">Choose a reason…</option>
              {["Wrong item", "Damaged in transit", "Not as described", "Changed my mind", "Allergic reaction"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select></label>
          <label className="field"><span>Anything else?</span>
            <textarea rows={3} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="Tell us what happened…" /></label>
          <label className="dropzone small">
            <FiDownload aria-hidden="true" />
            <b>Add photos</b>
            <small>Optional — a photo helps us approve faster.</small>
            <input type="file" accept="image/*" multiple hidden onChange={e => {
              const files = Array.from(e.target.files || []).slice(0, 4);
              Promise.all(files.map(f => new Promise(res => {
                const rd = new FileReader();
                rd.onload = () => res(rd.result);
                rd.onerror = () => res(null);
                rd.readAsDataURL(f);
              }))).then(photos => setForm(x => ({ ...x, photos: photos.filter(Boolean) })));
            }} />
          </label>
          {form.photos && form.photos.length > 0 && (
            <div className="thumb-row">
              {form.photos.map((src, i) => <img key={i} src={src} alt="" />)}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

/* ---------------- reviews ---------------- */
function CustomerReviews() {
  const orders = state.orders || [];
  const bought = useMemo(() => {
    const map = new Map();
    orders.forEach(o => (o.items || []).forEach(i => {
      const p = prod(i.slug) || PRODUCTS.find(x => x.name === i.name);
      if (p) map.set(p.id, p);
    }));
    return [...map.values()];
  }, [orders]);
  const mine = readLS("imibavu_myreviews", []);
  const [form, setForm] = useState(null);

  const submit = async () => {
    if (!form.stars) { notify.warning("Pick a star rating"); return; }
    const entry = { id: "rv" + Date.now(), at: Date.now(), ...form, verified: true };
    const next = [entry, ...mine];
    writeLS("imibavu_myreviews", next);
    setForm(null);
    notify.success("Thank you — your review is with us for approval");
  };

  return (
    <>
      {bought.length === 0
        ? <EmptyState icon={FiStar} title="Nothing to review yet" text="Once you receive an order you can rate each item here." />
        : (
          <SectionCard title="Rate your purchases">
            <ul className="review-targets">
              {bought.map(p => (
                <li key={p.id}>
                  <ProductImage product={p} alt="" loading="lazy" />
                  <div><b>{p.name}</b><small className="muted">{brandName(p.brand)}</small></div>
                  <button className="mini-btn" type="button" onClick={() => setForm({ pid: p.id, name: p.name, stars: 0, text: "", photos: [] })}>
                    {t("write_review")}
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

      {mine.length > 0 && (
        <SectionCard title="Your reviews">
          <ul className="activity-list">
            {mine.map(r => (
              <li key={r.id}>
                <span className="avatar" aria-hidden="true">{String(r.name || "?").slice(0, 2).toUpperCase()}</span>
                <div>
                  <b>{r.name} — {"★".repeat(r.stars)}</b>
                  <small className="muted">{new Date(r.at).toLocaleDateString("en-GB")} {r.verified ? "· verified buyer" : ""}</small>
                  <p>{r.text}</p>
                </div>
                <Badge tone="warn">Pending</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {form && (
        <Modal open title={`Review ${form.name}`} onClose={() => setForm(null)}
          footer={<>
            <button className="btn ghost" type="button" onClick={() => setForm(null)}>{t("cancel")}</button>
            <button className="btn" type="button" onClick={submit}>{t("post_review")}</button>
          </>}>
          <fieldset className="stars-input">
            <legend>Your rating</legend>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" className={form.stars >= n ? "on" : undefined}
                onClick={() => setForm({ ...form, stars: n })} aria-label={`${n} star${n === 1 ? "" : "s"}`}>★</button>
            ))}
          </fieldset>
          <label className="field"><span>Your review</span>
            <textarea rows={4} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
              placeholder="How does it wear? How long does it last?" /></label>
          <label className="dropzone small">
            <FiDownload aria-hidden="true" />
            <b>Add photos</b><small>Optional</small>
            <input type="file" accept="image/*" multiple hidden onChange={e => {
              const files = Array.from(e.target.files || []).slice(0, 3);
              Promise.all(files.map(f => new Promise(res => {
                const rd = new FileReader();
                rd.onload = () => res(rd.result);
                rd.onerror = () => res(null);
                rd.readAsDataURL(f);
              }))).then(photos => setForm(x => ({ ...x, photos: photos.filter(Boolean) })));
            }} />
          </label>
          {form.photos && form.photos.length > 0 && (
            <div className="thumb-row">{form.photos.map((s, i) => <img key={i} src={s} alt="" />)}</div>
          )}
          <p className="pill ok"><FiCheck aria-hidden="true" /> Verified buyer</p>
        </Modal>
      )}
    </>
  );
}

/* ---------------- blends / bookings / quiz ---------------- */
function CustomerBlends() {
  const blends = state.blends || [];
  return (
    <>
      {blends.length === 0
        ? <EmptyState icon={FiPackage} title="No saved blends" text="Build a custom blend and save it to reorder in one tap."
            action={<a className="btn" href="#/blends">{t("blend_builder")}</a>} />
        : blends.map((b, i) => (
          <div className="addr-card" key={b.id || b.name + i}>
            <div className="ac-head"><b>{b.name}</b><Badge tone="info">{b.sizeLabel}</Badge></div>
            <p className="muted">{b.baseLabel} · {(b.notes || []).join(" · ")}</p>
            <div className="row-btns">
              <button className="mini-btn" type="button" onClick={() => { blendLoad(i); go("#/blends"); notify.success("Blend loaded in the builder"); }}>
                {t("reorder")}
              </button>
              <button className="mini-btn danger" type="button" onClick={async () => {
                const ok = await notify.confirm({
                  title: `Delete "${b.name}"?`,
                  text: "This saved recipe will be removed from your account.",
                  confirmText: t("delete"), cancelText: t("cancel"), danger: true,
                });
                if (ok) { blendDel(i); notify.success("Blend deleted"); }
              }}>{t("delete")}</button>
            </div>
          </div>
        ))}
    </>
  );
}

function CustomerBookings() {
  const [list, setList] = useState(() => readLS("imibavu_bookings_local", []));
  const [form, setForm] = useState(null);

  const add = () => {
    if (!form.date || !form.time) { notify.warning("Pick a date and a time"); return; }
    const entry = { id: "b" + Date.now(), status: "pending", ...form };
    const next = [entry, ...list];
    setList(next);
    writeLS("imibavu_bookings_local", next);
    setForm(null);
    notify.result({
      icon: "success",
      title: "Booking requested",
      html: `<b>${entry.date} at ${entry.time}</b><br />We will confirm your slot on WhatsApp.`,
      confirmText: t("close"),
    });
  };

  return (
    <>
      <div className="pp-actions">
        <button className="btn sm" type="button" onClick={() => setForm({ date: "", time: "10:30", phone: (state.user || {}).phone || "", msg: "" })}>
          <FiPlus /> Book a session
        </button>
      </div>

      {list.length === 0
        ? <EmptyState icon={FiCalendar} title="No bookings yet" text="Book an in-store blending session at the T2000 shop."
            action={<button className="btn" type="button" onClick={() => setForm({ date: "", time: "10:30", phone: (state.user || {}).phone || "", msg: "" })}>{t("book_session")}</button>} />
        : list.map(b => (
          <div className="addr-card" key={b.id}>
            <div className="ac-head">
              <b>{b.date} at {b.time}</b>
              <Badge tone={b.status === "confirmed" ? "ok" : b.status === "cancelled" ? "bad" : "warn"}>{b.status}</Badge>
            </div>
            {b.msg && <p className="muted">{b.msg}</p>}
            <div className="row-btns">
              <button className="mini-btn" type="button" onClick={async () => {
                const when = await notify.askText({ title: "New date and time", placeholder: "2026-04-02 15:30", label: "Give a new slot" });
                if (when == null) return;
                setList(prev => {
                  const next = prev.map(x => x.id === b.id ? { ...x, date: when, status: "reschedule requested" } : x);
                  writeLS("imibavu_bookings_local", next);
                  return next;
                });
                notify.success(`Reschedule requested for ${when}`);
              }}>Reschedule</button>
              <button className="mini-btn danger" type="button" onClick={async () => {
                const ok = await notify.confirm({
                  title: "Cancel this session?",
                  text: `${b.date} at ${b.time} — the slot goes back to other customers.`,
                  confirmText: "Cancel session", cancelText: "Keep it", danger: true,
                });
                if (!ok) return;
                setList(prev => {
                  const next = prev.filter(x => x.id !== b.id);
                  writeLS("imibavu_bookings_local", next);
                  return next;
                });
                notify.success("Session cancelled");
              }}>Cancel</button>
            </div>
          </div>
        ))}

      {form && (
        <Modal open title={t("book_session")} onClose={() => setForm(null)}
          footer={<>
            <button className="btn ghost" type="button" onClick={() => setForm(null)}>{t("cancel")}</button>
            <button className="btn" type="button" onClick={add}>{t("send_request")}</button>
          </>}>
          <div className="form-grid two">
            <label className="field"><span>{t("book_date")}</span>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label className="field"><span>{t("book_time")}</span>
              <select value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}>
                {["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"].map(s => <option key={s} value={s}>{s}</option>)}
              </select></label>
          </div>
          <label className="field"><span>{t("phone_num")}</span>
            <input inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="field"><span>{t("book_msg")}</span>
            <textarea rows={3} value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })} /></label>
        </Modal>
      )}
    </>
  );
}

function CustomerScent() {
  const quiz = (state.quiz && state.quiz.a) || {};
  const has = quiz.mood || (quiz.notes || []).length;
  const matches = state.quiz && state.quiz.results
    ? state.quiz.results.map(prod).filter(Boolean)
    : PRODUCTS.filter(p => quiz.mood === "oud" ? ["Oud", "Woody", "Amber"].includes(p.family)
      : quiz.mood === "fresh" ? ["Fresh", "Citrus"].includes(p.family)
        : quiz.mood === "sweet" ? ["Sweet", "Floral"].includes(p.family)
          : quiz.mood === "musky" ? ["Musky", "Floral"].includes(p.family) : true).slice(0, 3);

  return (
    <>
      {!has
        ? <EmptyState icon={FiStar} title="No scent profile yet" text="Take the three-question Scent Finder to see your matches."
            action={<a className="btn" href="#/quiz">Take the quiz</a>} />
        : (
          <>
            <SectionCard title="Your scent style">
              <div className="scent-profile">
                {quiz.mood && <span className="pill info">{quiz.mood}</span>}
                {quiz.season && <span className="pill">{quiz.season}</span>}
                {(quiz.notes || []).map(n => <span className="pill" key={n}>{n}</span>)}
              </div>
              <a className="btn ghost sm" href="#/quiz"><FiRefreshCw /> Retake quiz</a>
            </SectionCard>
            <SectionCard title="Your matches">
              <div className="reco-row">
                {matches.map(p => (
                  <div className="reco-card" key={p.id}>
                    <a href={"#/product/" + p.id}><ProductImage product={p} alt={p.name} loading="lazy" /></a>
                    <b>{p.name}</b><small className="muted">{p.family}</small><span>{money(p.price)}</span>
                    <button className="mini-btn" type="button" onClick={() => addToCart(p.id)}>{t("add_cart")}</button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}
    </>
  );
}

/* ---------------- rewards / offers / notifications / security ---------------- */
function CustomerRewards() {
  const ly = state.loyalty;
  useEffect(() => { if (!ly) loadLoyalty(); }, [ly]);
  if (!ly) return <EmptyState icon={FiAward} title={t("loading")} text="Fetching your loyalty balance…" />;
  const pct = ly.nextTier ? Math.min(100, Math.round((ly.lifetime / ((ly.lifetime + ly.toNext) || 1)) * 100)) : 100;
  return (
    <>
      <SectionCard title="Loyalty balance">
        <div className="reward-head">
          <div><b>{ly.points}</b><span className="muted"> points available</span></div>
          <Badge tone="ok">{ly.tierLabel}</Badge>
        </div>
        <p className="muted">
          Worth {money((ly.points || 0) * (ly.pointValue || 1))} off your next order.
          {ly.nextTier ? ` ${ly.toNext} more points to reach ${ly.nextTierLabel}.` : " You are at our highest tier — thank you!"}
        </p>
        {ly.nextTier ? <div className="bar"><i style={{ width: pct + "%" }} /></div> : null}
        <p className="form-note">
          Earn {ly.earnPerRwf === 1000 ? "1 point per 1,000 RWF" : `${ly.earnPerRwf} points per RWF`} spent.
          Redeem {ly.redeemStep} points for {money(ly.redeemStep * ly.pointValue)} off at checkout.
        </p>
      </SectionCard>
      <SectionCard title="Recent activity">
        {(ly.history && ly.history.length)
          ? ly.history.map((h, i) => (
            <div className="summary-item" key={i}>
              <span>{h.type === "earn" ? "Earned" : "Redeemed"}{h.reason ? " · " + h.reason : ""}</span>
              <b>{h.type === "earn" ? "+" : "−"}{h.points}</b>
            </div>
          ))
          : <EmptyState compact icon={FiAward} title="No activity yet" text="Place an order or leave a review to earn points." />}
      </SectionCard>
    </>
  );
}

function CustomerOffers() {
  const coupons = (state.promos || []).filter(c => c.active);
  const referral = "IMB-" + String((state.user || {}).phone || "GUEST").replace(/\D/g, "").slice(-5);
  return (
    <>
      <SectionCard title="Coupons wallet">
        {coupons.length === 0
          ? <EmptyState compact icon={FiPercent} title="No coupons right now" text="Offers appear here when we run a promotion." />
          : coupons.map(c => (
            <div className="coupon" key={c.code}>
              <div className="coupon-left"><b>{c.code}</b><small>{c.label}</small></div>
              <button className="mini-btn" type="button" onClick={async () => {
                const ok = await notify.confirm({ title: `Apply ${c.code}?`, text: "We take you to checkout with the coupon ready.", confirmText: "Apply", cancelText: t("cancel") });
                if (ok) { notify.success(`${c.code} ready at checkout`); go("#/checkout"); }
              }}>Use</button>
              {c.until && <span className="coupon-expiry">Expires {c.until}</span>}
            </div>
          ))}
      </SectionCard>

      <SectionCard title="Referral code">
        <div className="referral-box">
          <code>{referral}</code>
          <button className="mini-btn" type="button" onClick={async () => {
            try { await navigator.clipboard.writeText(referral); notify.success("Referral code copied"); }
            catch (e) { notify.info(referral); }
          }}>Copy</button>
          <a className="mini-btn" target="_blank" rel="noopener noreferrer"
            href={waLink(`Try Imibavu Collection with my code ${referral}.`)}>Share</a>
        </div>
        <p className="form-note">Both of you get loyalty points when your friend's first order is delivered.</p>
      </SectionCard>

      <SectionCard title="Gift ideas" action={<a className="link-more" href="#/shop?col=gifts">Shop gifts</a>}>
        <div className="reco-row">
          {PRODUCTS.slice(0, 3).map(p => (
            <div className="reco-card" key={p.id}>
              <a href={"#/product/" + p.id}><ProductImage product={p} alt={p.name} loading="lazy" /></a>
              <b>{p.name}</b><span>{money(p.price)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function CustomerNotifications() {
  const [prefs, setPrefs] = useState(() => readLS("imibavu_prefs", {
    orderUpdates: { sms: true, email: false, whatsapp: true },
    promotions: { sms: false, email: true, whatsapp: true },
    restock: { sms: false, email: false, whatsapp: true },
  }));

  const set = (type, channel, value) => {
    const next = { ...prefs, [type]: { ...prefs[type], [channel]: value } };
    setPrefs(next);
    writeLS("imibavu_prefs", next);
  };

  const types = [
    ["orderUpdates", "Order updates", "Placed, confirmed, packed, out for delivery, delivered"],
    ["promotions", "Offers and new arrivals", "Seasonal promotions and new fragrances"],
    ["restock", "Back in stock", "When a wishlist item returns"],
  ];

  return (
    <SectionCard title="How should we reach you?">
      <p className="muted">Choose a channel per type of update. We always send order confirmations, whatever you pick here.</p>
      <div className="prefs-table">
        <div className="prefs-head"><span>Update</span><span>SMS</span><span>Email</span><span>WhatsApp</span></div>
        {types.map(([id, label, sub]) => (
          <div className="prefs-row" key={id}>
            <span><b>{label}</b><small className="muted">{sub}</small></span>
            {["sms", "email", "whatsapp"].map(ch => (
              <label key={ch} className="switch-row center">
                <input type="checkbox" checked={!!prefs[id][ch]} aria-label={`${label} by ${ch}`}
                  onChange={e => set(id, ch, e.target.checked)} />
              </label>
            ))}
          </div>
        ))}
      </div>
      <button className="btn sm" type="button" onClick={() => notify.success("Notification preferences saved")}>{t("save")}</button>
    </SectionCard>
  );
}

function CustomerSecurity() {
  const [mfaCode, setMfaCode] = useState("");
  const [sessions, setSessions] = useState([{ id: 1, device: "This browser", where: "Kigali, RW", at: Date.now(), current: true }]);

  const downloadData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: state.user,
      orders: state.orders,
      wishlist: state.wish,
      blends: state.blends,
      loyalty: state.loyalty,
      addresses: readLS("imibavu_addresses", []),
      returns: readLS("imibavu_returns", []),
      reviews: readLS("imibavu_myreviews", []),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "imibavu-my-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify.success("Your data has been downloaded");
  };

  return (
    <>
      <SectionCard title="Password">
        <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" /></label>
        <label className="field"><span>New password</span><input type="password" autoComplete="new-password" /></label>
        <button className="btn sm" type="button" onClick={async () => {
          const ok = await notify.confirm({
            title: "Change your password?",
            text: "You stay signed in on this device. Other devices keep working until their session ends.",
            confirmText: "Change password", cancelText: t("cancel"),
          });
          if (ok) notify.success("Password changed");
        }}>Change password</button>
      </SectionCard>

      <SectionCard title="Two-step verification">
        {state.user && state.user.mfaEnabled ? (
          <>
            <p className="pill ok"><FiCheck /> Enabled</p>
            <label className="field"><span>Enter a code to turn it off</span>
              <input inputMode="numeric" value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="123456" /></label>
            <button className="btn ghost sm" type="button" onClick={async () => {
              if (mfaCode.length < 6) { notify.warning("Enter the 6-digit code"); return; }
              try { await disableMfa(mfaCode); } catch (err) { notify.apiError(err); }
            }}>Turn off</button>
          </>
        ) : (
          <>
            <p className="muted">Optional for customers — adds a code from your authenticator app at sign-in.</p>
            <button className="btn sm" type="button" onClick={() => notify.info("Two-step setup starts at your next sign-in")}>Set up two-step</button>
          </>
        )}
      </SectionCard>

      <SectionCard title="Active sessions"
        action={<button className="mini-btn danger" type="button" onClick={async () => {
          const ok = await notify.confirm({
            title: "Sign out of all other devices?",
            text: "Any other phone or computer signed into your account will be signed out.",
            confirmText: "Sign out everywhere", cancelText: t("cancel"), danger: true,
          });
          if (!ok) return;
          setSessions(s => s.filter(x => x.current));
          notify.success("Other sessions ended");
        }}>Sign out all devices</button>}>
        <ul className="activity-list">
          {sessions.map(s => (
            <li key={s.id}>
              <span className="avatar" aria-hidden="true"><FiSmartphone /></span>
              <div><b>{s.device}{s.current ? " (current)" : ""}</b>
                <small className="muted">{s.where} · {new Date(s.at).toLocaleString("en-GB")}</small></div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Your data">
        <p className="muted">Download everything we hold about you, or delete your account. EU-style rights, honoured locally.</p>
        <div className="row-btns">
          <button className="btn ghost sm" type="button" onClick={downloadData}><FiDownload /> Download my data</button>
          <button className="btn ghost sm danger" type="button" onClick={async () => {
            const ok = await notify.confirm({
              title: "Delete your account?",
              html: "This removes your profile, wishlist, saved blends and addresses.<br /><b>Order history stays for accounting.</b>",
              confirmText: "Delete my account", cancelText: "Keep my account", danger: true,
            });
            if (!ok) return;
            writeLS("imibavu_wish", []);
            writeLS("imibavu_blends", []);
            writeLS("imibavu_addresses", []);
            notify.result({
              icon: "success",
              title: "Account deletion requested",
              html: "We will confirm by SMS within 24 hours, then remove your personal data.",
              confirmText: t("close"),
            });
          }}>Delete account</button>
        </div>
        <label className="field" style={{ marginTop: 12 }}><span>{t("language")}</span>
          <select value={state.lang} onChange={e => setLang(e.target.value)}>
            <option value="en">English</option><option value="rw">Kinyarwanda</option><option value="fr">Français</option>
          </select></label>
      </SectionCard>
    </>
  );
}

/* ---------------- bottom tab bar (phones) ---------------- */
function CustomerBottomBar() {
  const route = (window.location.hash.split("?")[0].replace("#/account", "").replace("#/", "") || "");
  const items = [
    ["Home", "#/", FiHomeIcon],
    ["Orders", "#/account/orders", FiShoppingBag],
    ["Wishlist", "#/account/wish", FiHeart],
    ["Cart", "#/checkout", FiCartIcon],
    ["Account", "#/account", FiLockIcon],
  ];
  return (
    <nav className="cu-bottombar" aria-label="Account shortcuts">
      {items.map(([label, href, Icon], i) => (
        <a key={label} href={href} className={i === 4 && !route ? "on" : undefined}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </a>
      ))}
    </nav>
  );
}
function FiHomeIcon(p) { return <FiPackage {...p} />; }
function FiCartIcon(p) { return <FiShoppingBag {...p} />; }
function FiLockIcon(p) { return <FiLock {...p} />; }

/* ---------------- page switch ---------------- */
export default function Account() {
  const route = (() => {
    const raw = (typeof window !== "undefined" ? window.location.hash.slice(1) : "/account") || "/account";
    const [path, qs] = raw.split("?");
    return { seg: path.split("/").filter(Boolean), params: new URLSearchParams(qs || "") };
  })();
  const sub = route.seg[1] || "";

  useEffect(() => {
    if (!state.user) return;
    if (!state.loyalty) loadLoyalty();
    if (state.orders && state.orders[0]) fetchOrder(state.orders[0].code);
  }, []);

  if (!state.user) {
    return (
      <>
        <div className="page-head"><div className="container">
          <span className="kicker">{t("account_dash")}</span>
          <h1>{t("login_title")}</h1>
          <p>{t("login_sub")}</p>
        </div></div>
        <div className="page-body"><div className="container" style={{ maxWidth: 460 }}>
          <div className="empty-state">
            <h3>{t("account_dash")}</h3>
            <p className="muted">Sign in to see your orders, wishlist, saved blends, bookings and rewards.</p>
            <div className="row-btns center-row">
              <a className="btn" href="#/login">{t("log_signin")}</a>
              <a className="btn ghost" href="#/login?mode=register">{t("log_create")}</a>
            </div>
          </div>
        </div></div>
      </>
    );
  }

  const titles = {
    "": "dashboard",
    orders: "orders_nav",
    wish: "wishlist_nav",
    addresses: "addresses",
    returns: "returns",
    reviews: "reviews_title",
    blends: "saved_blends",
    bookings: "bookings",
    rewards: "loyalty",
    offers: "offers",
    notifications: "notifications",
    security: "security_privacy",
  };

  const body = (() => {
    switch (sub) {
      case "": return <CustomerHome />;
      case "orders": return <CustomerOrders />;
      case "wish": return <CustomerWishlist />;
      case "addresses": return <CustomerAddresses />;
      case "returns": return <CustomerReturns />;
      case "reviews": return <CustomerReviews />;
      case "blends": return <CustomerBlends />;
      case "bookings": return <CustomerBookings />;
      case "scent": return <CustomerScent />;
      case "rewards": return <CustomerRewards />;
      case "offers": return <CustomerOffers />;
      case "notifications": return <CustomerNotifications />;
      case "security": return <CustomerSecurity />;
      default: return <CustomerHome />;
    }
  })();

  return (
    <>
      <div className="cu-topnav">
        <a href="#/shop">{t("nav_shop")}</a>
        <a href="#/brands">{t("nav_brands")}</a>
        <a href="#/blends">{t("nav_blends")}</a>
        <a href="#/quiz">{t("quiz_title")}</a>
      </div>

      <PortalPage
        title={t(titles[sub] || "dashboard")}
        crumbs={[{ label: t("account_dash"), href: "#/account" }, ...(sub ? [{ label: t(titles[sub]) }] : [])]}
        action={
          <div className="pp-actions">
            <button className="btn ghost sm" type="button" onClick={async () => {
              const ok = await notify.confirm({
                title: "Log out?",
                text: "You will need to sign in again.",
                confirmText: t("logout"), cancelText: t("cancel"), danger: true,
              });
              if (ok) { logout(); notify.success("Signed out"); go("#/login"); }
            }}>{t("logout")}</button>
          </div>
        }
      >
        <CustomerMenu route={route}>{body}</CustomerMenu>
      </PortalPage>

      {(state.orders || []).length > 0 && ["", "orders"].includes(sub) && (
        <div className="sticky-actions">
          <a className="btn sm" href={"#/order/" + state.orders[0].code}><FiTruck /> Track order</a>
          <button className="btn ghost sm" type="button" onClick={() => {
            (state.orders[0].items || []).forEach(i => {
              const p = prod(i.slug) || PRODUCTS.find(x => x.name === i.name);
              if (p) addToCart(p.id, 0, i.qty || 1);
            });
            notify.success("Added back to your cart");
            go("#/checkout");
          }}><FiRepeat /> Reorder</button>
        </div>
      )}

      <CustomerBottomBar />
    </>
  );
}
