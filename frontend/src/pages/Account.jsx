import { useStore, state, logout, accTab, loadLoyalty, addToCart, toggleWish, blendLoad, blendDel, prod } from "../store";
import { t } from "../i18n";
import { money, brandName } from "../utils";
import ProductImage from "../components/ProductImage";

export default function Account() {
  useStore();

  if (!state.user) {
    return (
      <>
        <div className="page-head"><div className="container"><span className="kicker">{t("account")}</span><h1>{t("login_title")}</h1><p>{t("login_sub")}</p></div></div>
        <div className="page-body"><div className="container" style={{ maxWidth: 460 }}>
          <div className="empty-state">
            <h3>{t("account_dash")}</h3>
            <p className="muted">Sign in to view orders, your wishlist, saved blends and rewards.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
              <a className="btn" href="#/login">{t("log_signin")}</a>
              <a className="btn ghost" href="#/login?mode=register">{t("log_create")}</a>
            </div>
          </div>
        </div></div>
      </>
    );
  }

  if (state.acc.tab === "rewards" && !state.loyalty) loadLoyalty();
  const tabs = [["orders", t("orders")], ["wish", t("wishlist_title")], ["blends", t("saved_blends")], ["rewards", "Rewards"], ["addr", t("addresses")]];
  const ly = state.loyalty;
  const pct = ly && ly.nextTier ? Math.min(100, Math.round((ly.lifetime / (ly.lifetime + ly.toNext || 1)) * 100)) : 100;
  const wishItems = state.wish.map(prod).filter(Boolean);
  return (
    <>
      <div className="page-head"><div className="container">
        <span className="kicker">{t("account_dash")}</span><h1>{state.user.name || state.user.phone}</h1><p>{state.user.phone}</p>
      </div></div>
      <div className="page-body"><div className="container">
        <div className="tabs">
          {tabs.map(([k, l]) => <button key={k} className={`tab ${state.acc.tab === k ? "on" : ""}`} onClick={() => accTab(k)}>{l}</button>)}
          <button className="tab" style={{ marginLeft: "auto", color: "var(--red)" }} onClick={logout}>{t("logout")}</button>
        </div>

        {state.acc.tab === "orders" && (state.orders.length ? state.orders.map(o => {
          const ps = o.paymentStatus || "unpaid";
          const psPill = { paid: "ok", pending: "info", failed: "warn", unpaid: "", refunded: "" }[ps];
          const payTag = ps === "paid" ? "" : ` ${ps === "pending" ? "Pay pending" : ps === "failed" ? "Pay failed" : "Pay due"}`;
          return (
            <div className="list-card" key={o.code}>
              <div className="avatar" style={{ borderRadius: 10 }}>{String(o.code).slice(-2)}</div>
              <div className="lc-info"><b>{o.code}</b><span>{o.date} · {o.items.length} items · {money(o.total)}</span></div>
              <span className={`pill info`}>{o.status}</span>{payTag && <span className={`pill ${psPill}`}>{payTag.trim()}</span>}
              <a className="mini-btn" href={"#/order/" + o.code}>View</a>
            </div>
          );
        }) : <div className="empty-state"><h3>No orders yet</h3><a className="btn ghost sm" href="#/shop">{t("back_shop")}</a></div>)}

        {state.acc.tab === "wish" && (wishItems.length ? wishItems.map(p => (
          <div className="list-card" key={p.id}>
            <ProductImage product={p} alt="" className="wish-img" />
            <div className="lc-info"><b>{p.name}</b><span>{brandName(p.brand)} · {money(p.price)}</span></div>
            <button className="mini-btn" onClick={() => addToCart(p.id)}>{t("add_cart")}</button>
            <button className="mini-btn" onClick={() => toggleWish(p.id)}>×</button>
          </div>
        )) : <div className="empty-state"><h3>{t("wishlist_title")} is empty</h3></div>)}

        {state.acc.tab === "blends" && (state.blends.length ? state.blends.map((b, i) => (
          <div className="list-card" key={b.id || b.name + i}>
            <div className="avatar" style={{ borderRadius: 12 }}>BL</div>
            <div className="lc-info"><b>{b.name}</b><span>{b.baseLabel} · {b.notes.join(" · ")} · {b.sizeLabel}</span></div>
            <button className="mini-btn" onClick={() => blendLoad(i)}>{t("reorder")}</button>
            <button className="mini-btn" onClick={() => blendDel(i)}>×</button>
          </div>
        )) : <div className="empty-state"><h3>No saved blends</h3><a className="btn ghost sm" href="#/blends">{t("blend_builder")}</a></div>)}

        {state.acc.tab === "rewards" && (!ly ? <div className="empty-state"><h3>Loading rewards…</h3></div> : (
          <>
            <div className="card-box">
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                <span className="pill ok">{ly.tierLabel}</span>
                <span className="muted">{ly.points} points available · {ly.lifetime} lifetime</span>
              </div>
              {ly.nextTier ? (
                <p className="muted" style={{ marginTop: 10 }}>{ly.toNext} more points to reach {ly.nextTierLabel}.</p>
              ) : <p className="muted" style={{ marginTop: 10 }}>You are at our highest tier — thank you!</p>}
              {ly.nextTier ? <div className="bar"><i style={{ width: pct + "%" }} /></div> : null}
              <p className="form-note" style={{ marginTop: 12 }}>Earn {ly.earnPerRwf === 1000 ? "1 point per 1,000 RWF" : ly.earnPerRwf + " points per RWF"} spent. Redeem {ly.redeemStep} points for {money(ly.redeemStep * ly.pointValue)} off at checkout.</p>
            </div>
            <div className="card-box" style={{ marginTop: 16 }}><h3>Recent activity</h3>
              {(ly.history && ly.history.length) ? ly.history.map((h, i) => (
                <div className="summary-item" key={i}><span>{h.type === "earn" ? "Earned" : "Redeemed"}{h.reason ? " · " + h.reason : ""}</span><b>{h.type === "earn" ? "+" : "−"}{h.points}</b></div>
              )) : <p className="muted">No activity yet — place an order or leave a review to earn points.</p>}
            </div>
          </>
        ))}

        {state.acc.tab === "addr" && (
          <>
            <div className="list-card"><div className="avatar" style={{ borderRadius: 10 }}>📍</div><div className="lc-info"><b>Home — Downtown Kigali</b><span>KK Center area · default</span></div></div>
            <div className="list-card"><div className="avatar" style={{ borderRadius: 10 }}>🏢</div><div className="lc-info"><b>Office — T2000 Building</b><span>Ground floor · pickup</span></div></div>
            <button className="btn ghost sm" onClick={() => {}}>{t("save")}</button>
          </>
        )}
      </div></div>
    </>
  );
}