import { useState } from "react";
import { useStore, state, cartSubtotal, prod, placeOrder } from "../store";
import { t } from "../i18n";
import { ZONES, DELIVERY_PROMO } from "../data";
import { money, waLink, sizeLabel } from "../utils";
import { FaWhatsapp } from "../components/Icons";

export default function Checkout() {
  useStore();
  const [f, setF] = useState({
    name: (state.user && state.user.name) || "",
    phone: (state.user && state.user.phone) || "",
    email: "",
    zone: ZONES[0].id,
    note: "",
    pay: "momo",
    promo: "",
    loyaltyPoints: 0,
  });
  const [busy, setBusy] = useState(false);
  const sub = cartSubtotal();
  const zone = ZONES.find(z => z.id === f.zone) || ZONES[0];
  const fee = zone.id === "pickup" || sub >= 60000 ? 0 : zone.fee;
  const total = sub + fee;

  if (!state.cart.length) {
    return (
      <div className="page-body"><div className="container empty-state">
        <h3>{t("cart_empty")}</h3><a className="btn" href="#/shop">{t("back_shop")}</a>
      </div></div>
    );
  }

  const loyalty = state.user && state.loyalty && state.loyalty.points >= state.loyalty.redeemStep ? state.loyalty : null;
  const saveLoyalty = Math.min(Math.max(0, Math.floor(Number(f.loyaltyPoints) || 0)),
    loyalty ? Math.floor(loyalty.points / loyalty.redeemStep) * loyalty.redeemStep : 0);
  const loyaltyDiscount = saveLoyalty ? saveLoyalty * (loyalty.pointValue || 1) : 0;
  const grand = Math.max(0, total - loyaltyDiscount);

  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Secure · HTTPS</span><h1>{t("checkout_title")}</h1>
        <p>{t("guest_note")}</p>
      </div></section>
      <div className="page-body"><div className="container checkout-grid">
        <form className="stack" onSubmit={e => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          const discount = saveLoyalty ? saveLoyalty * (loyalty.pointValue || 1) : 0;
          placeOrder({ ...f, loyaltyPoints: saveLoyalty, discount, fee, total: grand }, err => { if (!err) setBusy(false); });
        }}>
          <div className="card-box">
            <h3>{t("contact_details")}</h3>
            <div className="form-grid two" style={{ marginTop: 14 }}>
              <div className="field"><label>{t("full_name")}</label><input name="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></div>
              <div className="field"><label>{t("phone")}</label><input name="phone" type="tel" placeholder="+250 7.." value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} required /></div>
              <div className="field" style={{ gridColumn: "1/-1" }}><label>{t("email")}</label><input name="email" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
            </div>
          </div>

          <div className="card-box">
            <h3>{t("delivery_method")}</h3>
            <div className="stack" style={{ marginTop: 14 }}>
              {ZONES.map((z, i) => (
                <label className={`radio-card ${f.zone === z.id ? "on" : ""}`} key={z.id}>
                  <input type="radio" name="zone" checked={f.zone === z.id} onChange={() => setF({ ...f, zone: z.id })} />
                  <span><b>{z.label}</b><span>{z.fee ? money(z.fee) + " delivery" : "Free — collect at the store"}</span></span>
                </label>
              ))}
            </div>
            <div className="field" style={{ marginTop: 14 }}><label>Delivery note (zone, landmark)</label><input name="note" placeholder="e.g. Kimironko, near the pharmacy" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} /></div>
          </div>

          <div className="card-box">
            <h3>{t("payment")}</h3>
            <div className="stack" style={{ marginTop: 14 }}>
              {[["momo", t("pay_momo"), "You receive a payment request by SMS after confirming."],
                ["cash", t("pay_cash"), "Pay the rider on arrival in Kigali."],
                ["pickup", t("pay_pickup"), "T2000 Building, ground floor."]].map(([v, lbl, subLbl]) => (
                <label className={`radio-card ${f.pay === v ? "on" : ""}`} key={v}>
                  <input type="radio" name="pay" checked={f.pay === v} onChange={() => setF({ ...f, pay: v })} />
                  <span><b>{lbl}</b><span>{subLbl}</span></span>
                </label>
              ))}
            </div>
            <div className="field" style={{ marginTop: 14 }}><label>Promo code</label><input name="promo" placeholder={DELIVERY_PROMO.code} value={f.promo} onChange={e => setF({ ...f, promo: e.target.value })} /></div>
            {loyalty && (
              <div className="field" style={{ marginTop: 14 }}>
                <label>Use loyalty points</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="number" min={0} max={Math.floor(loyalty.points / loyalty.redeemStep) * loyalty.redeemStep} step={loyalty.redeemStep} value={f.loyaltyPoints} style={{ maxWidth: 150 }}
                    onChange={e => setF({ ...f, loyaltyPoints: e.target.value })} />
                  <span className="muted">{loyalty.points} points · {loyalty.redeemStep} pts = {money(loyalty.redeemStep * loyalty.pointValue)} off</span>
                </div>
              </div>
            )}
          </div>

          <button className="btn full" type="submit" disabled={busy}>{busy ? "Placing order…" : t("place_order")}</button>
          <p className="form-note center">🔒 Secure checkout · {t("tax_note")}</p>
        </form>

        <aside className="summary-box">
          <h3 style={{ fontSize: "1.3rem", marginBottom: 12 }}>{t("cart_title")}</h3>
          {state.cart.map(i => {
            const p = prod(i.pid); if (!p) return null;
            return <div className="summary-item" key={p.id + "-" + i.size}><span>{p.name} × {i.qty}<br /><small className="muted">{sizeLabel(p.sizes[i.size])}</small></span><b>{money(p.sizes[i.size][1] * i.qty)}</b></div>;
          })}
          <div className="summary-item"><span>{t("subtotal")}</span><b>{money(sub)}</b></div>
          <div className="summary-item"><span>{t("delivery")}</span><b>{fee ? money(fee) : "Free downtown"}</b></div>
          {loyaltyDiscount > 0 && <div className="summary-item"><span>Loyalty discount</span><b>−{money(loyaltyDiscount)}</b></div>}
          <div className="summary-item" style={{ fontFamily: "var(--serif)", fontSize: "1.2rem", borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 12 }}>
            <span>{t("total")}</span><b>{money(grand)}</b>
          </div>
          <a className="btn wa-btn full" style={{ marginTop: 14 }} target="_blank" rel="noopener noreferrer" href={waLink("Hello Imibavu Collection, I am checking out online and have a question about my order.")}>
            <FaWhatsapp /> {t("buy_whatsapp")}
          </a>
        </aside>
      </div></div>
    </>
  );
}