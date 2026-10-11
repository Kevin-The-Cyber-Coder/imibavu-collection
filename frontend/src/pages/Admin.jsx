import { useEffect, useState } from "react";
import { useStore, state, admTab, loadAdminData, admHide, admStock, admPrice, admBulk, admPromo, admPromoAdd, admRev2, admOrderStatus, stockOf, prod } from "../store";
import { t } from "../i18n";
import { PRODUCTS } from "../data";
import { money, brandName } from "../utils";
import Stars from "../components/Stars";

export default function Admin() {
  useStore();
  const [csv, setCsv] = useState("");
  const [pk, setPk] = useState("");
  const [pl, setPl] = useState("");
  useEffect(() => { if (state.user && (state.user.role === "admin" || state.user.role === "staff")) loadAdminData(); }, [state.user && state.user.id]);

  if (!state.user || !["admin", "staff"].includes(state.user.role)) {
    return (
      <>
        <div className="page-head"><div className="container"><span className="kicker">{t("admin")}</span><h1>Back office</h1></div></div>
        <div className="page-body"><div className="container" style={{ maxWidth: 520 }}>
          <div className="empty-state">
            <h3>{state.user ? "Staff access required" : "Sign in required"}</h3>
            <p className="muted">{state.user ? "This account does not have back-office permissions." : "Sign in with a staff or admin account to continue."}</p>
            <a className="btn" href="#/account">{state.user ? "Back to account" : t("continue")}</a>
          </div>
        </div></div>
      </>
    );
  }

  const tabs = [["products", t("admin_products")], ["orders", t("admin_orders")], ["promos", "Promos"], ["reviews", "Reviews"], ["reports", t("admin_reports")]];
  const orderList = state.adm.orders.length ? state.adm.orders : state.orders;
  const revenue = orderList.reduce((n, o) => n + (o.total || 0), 0);
  const best = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 6);
  const max = best[0] ? best[0].reviews : 1;

  return (
    <>
      <div className="page-head"><div className="container">
        <span className="kicker">Internal</span><h1>{t("admin")}</h1><p>Manage products, orders, promotions and reports.</p>
      </div></div>
      <div className="page-body"><div className="container">
        <div className="tabs">
          {tabs.map(([k, l]) => <button key={k} className={`tab ${state.adm.tab === k ? "on" : ""}`} onClick={() => admTab(k)}>{l}</button>)}
        </div>

        {state.adm.tab === "products" && (
          <>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>Product</th><th>Brand</th><th>{t("category")}</th><th>{t("price_rwf")}</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead>
              <tbody>
                {PRODUCTS.map(p => {
                  const st = stockOf(p);
                  const hidden = state.hidden.includes(p.id);
                  return (
                    <tr key={p.id}>
                      <td><b style={{ fontWeight: 400 }}>{p.name}</b></td><td>{brandName(p.brand)}</td><td>{p.category}</td>
                      <td>{money(p.price)}</td>
                      <td><span className={`pill ${hidden ? "bad" : st === "out" ? "bad" : st === "low" ? "warn" : "ok"}`}>{hidden ? "Hidden" : st === "in" ? "Active" : st === "low" ? "Low stock" : "Out of stock"}</span></td>
                      <td className="row-actions">
                        <button className="mini-btn" onClick={() => admPrice(p.id, prompt("New price (RWF):", p.price))}>Price</button>
                        <button className="mini-btn" onClick={() => admStock(p.id)}>{st === "out" ? "Restock" : st === "low" ? "Full" : "Sell out"}</button>
                        <button className="mini-btn" onClick={() => admHide(p.id)}>{hidden ? "Show" : "Hide"}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
            <div className="card-box" style={{ marginTop: 18 }}>
              <h3>Bulk upload (CSV)</h3>
              <p className="form-note">One product per line: <code>name,brandId,category,price,colorHex</code></p>
              <div className="field" style={{ marginTop: 10 }}><textarea value={csv} onChange={e => setCsv(e.target.value)} placeholder="Oud Velvet,lattafa,perfumes,41000,#5b3a24" /></div>
              <button className="btn sm" style={{ marginTop: 10 }} onClick={() => admBulk(csv)}>Import</button>
            </div>
          </>
        )}

        {state.adm.tab === "orders" && (orderList.length ? (
          <div className="table-wrap"><table className="data">
            <thead><tr><th>Code</th><th>Customer</th><th>Items</th><th>{t("total")}</th><th>Payment</th><th>{t("status")}</th></tr></thead>
            <tbody>
              {orderList.map((o, i) => (
                <tr key={o.code}>
                  <td><b style={{ fontWeight: 400 }}>{o.code}</b><br /><small className="muted">{o.date}</small></td>
                  <td>{o.name}<br /><small className="muted">{o.phone}</small></td>
                  <td>{o.items.reduce((n, x) => n + x.qty, 0)}</td><td>{money(o.total)}</td>
                  <td>{o.payment}</td>
                  <td><select className="mini-btn" value={o.status} onChange={e => admOrderStatus(o.code, e.target.value)}>
                    {["Received", "Confirmed", "Out for delivery", "Delivered"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : <div className="empty-state"><h3>No orders yet</h3></div>)}

        {state.adm.tab === "promos" && (
          <>
            <div className="table-wrap"><table className="data">
              <thead><tr><th>Code</th><th>Offer</th><th>{t("status")}</th><th>{t("actions")}</th></tr></thead>
              <tbody>
                {state.promos.map((pr, i) => (
                  <tr key={pr.code}>
                    <td><b style={{ fontWeight: 400 }}>{pr.code}</b></td><td>{pr.label}</td>
                    <td><span className={`pill ${pr.active ? "ok" : "bad"}`}>{pr.active ? "Active" : "Paused"}</span></td>
                    <td className="row-actions"><button className="mini-btn" onClick={() => admPromo(i)}>{pr.active ? "Pause" : "Activate"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="card-box" style={{ marginTop: 18 }}><h3>New promo</h3>
              <div className="form-grid two" style={{ marginTop: 12 }}>
                <div className="field"><label>Code</label><input value={pk} onChange={e => setPk(e.target.value)} placeholder="KIGALI10" /></div>
                <div className="field"><label>Offer</label><input value={pl} onChange={e => setPl(e.target.value)} placeholder="10% off oils" /></div>
              </div>
              <button className="btn sm" style={{ marginTop: 12 }} onClick={() => { admPromoAdd(pk, pl); setPk(""); setPl(""); }}>Create</button>
            </div>
          </>
        )}

        {state.adm.tab === "reviews" && ((state.adm.reviews || []).length ? state.adm.reviews.map(r => (
          <div className="list-card" key={r._id}>
            <div className="avatar">{String(r.name || "?").slice(0, 2).toUpperCase() || "?"}</div>
            <div className="lc-info"><b>{(prod(r.slug) || {}).name || r.slug} — {r.name}</b><span><Stars r={r.stars} /></span><br /><span>{r.text}</span></div>
            <span className={`pill ${r.status === "hidden" ? "bad" : r.status === "pending" ? "warn" : "ok"}`}>{r.status === "hidden" ? "Hidden" : r.status === "pending" ? "Pending" : "Live"}</span>
            <button className="mini-btn" onClick={() => admRev2(r._id)}>{r.status === "hidden" ? "Approve" : "Hide"}</button>
          </div>
        )) : <div className="empty-state"><h3>{state.adm.reviewsLoaded ? "No customer reviews submitted yet" : "Loading reviews…"}</h3></div>)}

        {state.adm.tab === "reports" && (
          <>
            <div className="stat-grid">
              <div className="stat"><span>Revenue</span><b>{money(revenue)}</b></div>
              <div className="stat"><span>Orders</span><b>{orderList.length}</b></div>
              <div className="stat"><span>Products</span><b>{PRODUCTS.length}</b></div>
              <div className="stat"><span>Avg. rating</span><b>4.7 ★</b></div>
            </div>
            <div className="card-box"><h3>Best sellers (by reviews)</h3>
              {best.map(p => (
                <div style={{ marginTop: 12 }} key={p.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".87rem" }}><span>{p.name} — {brandName(p.brand)}</span><b>{p.reviews}</b></div>
                  <div className="bar"><i style={{ width: (p.reviews / max) * 100 + "%" }} /></div>
                </div>
              ))}
            </div>
            <div className="card-box" style={{ marginTop: 16 }}><h3>Low stock alerts</h3>
              {PRODUCTS.filter(p => stockOf(p) !== "in").map(p => (
                <div className="landmark" key={p.id}><b>!</b><span>{p.name} — {stockOf(p) === "out" ? "Out of stock" : "Low stock"}</span></div>
              )) || <p className="muted">All products in stock.</p>}
              {!PRODUCTS.some(p => stockOf(p) !== "in") && <p className="muted">All products in stock.</p>}
            </div>
          </>
        )}
      </div></div>
    </>
  );
}