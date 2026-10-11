import { useEffect } from "react";
import { useStore, state, fetchOrder, payForOrder } from "../store";
import { t } from "../i18n";
import { money, waLink } from "../utils";
import { FaWhatsapp } from "../components/Icons";

const PS = { paid: ["Paid", "#0f5132"], pending: ["Payment pending", "#8a6d1f"], failed: ["Payment failed", "#a12b1f"], unpaid: ["Payment due", "#7a7368"], refunded: ["Refunded", "#7a7368"] };

export default function OrderPage({ code }) {
  useStore();
  let o = state.orders.find(x => x.code === code);
  const needsRefresh = !state.orderFetched[code] && (!o || (o.paymentStatus || "unpaid") !== "paid");
  useEffect(() => { if (needsRefresh) fetchOrder(code); }, [code]);

  if (!o) {
    return (
      <div className="page-body"><div className="container empty-state">
        <h3>Order not found</h3><a className="btn ghost" href="#/">{t("home")}</a>
      </div></div>
    );
  }
  const ps = o.paymentStatus || "unpaid";
  const [psLabel, psColor] = PS[ps] || ["Payment due", "#7a7368"];
  const canPay = ["momo", "card"].includes(String(o.payment || "").toLowerCase()) && ["unpaid", "failed"].includes(ps);
  return (
    <div className="page-body"><div className="container">
      <div className="order-success">
        <div className="tick">✓</div>
        <h1 style={{ fontSize: "clamp(2rem,6vw,3rem)" }}>{t("order_done")}</h1>
        <p className="muted">{t("order_done_text")}</p>
        <div className="order-code">{o.code}</div>
        <p className="muted">{o.date} · {o.status} · {o.payment}</p>
        <p style={{ fontWeight: 600, color: psColor }}>{psLabel}</p>
        <div className="contact-actions" style={{ justifyContent: "center" }}>
          {canPay && <button className="btn" onClick={() => payForOrder(o.code)}>Pay {money(o.total)} now</button>}
          <a className="btn wa-btn" target="_blank" rel="noopener noreferrer" href={waLink(`Hello Imibavu Collection, this is about order ${o.code} (${o.name}, ${money(o.total)}).`)}>
            <FaWhatsapp /> {t("whatsapp")}
          </a>
          <a className="btn ghost" href="#/account">{t("orders")}</a>
          <a className="btn ghost" href="#/shop">{t("back_shop")}</a>
        </div>
      </div>
      <div className="summary-box" style={{ maxWidth: 560, margin: "0 auto" }}>
        {o.items.map(i => <div className="summary-item" key={i.name + i.size}><span>{i.name} × {i.qty}<br /><small className="muted">{i.size}</small></span><b>{money(i.price * i.qty)}</b></div>)}
        <div className="summary-item"><span>{t("delivery")}</span><b>{o.zoneLabel}</b></div>
        {o.discount ? <div className="summary-item"><span>Loyalty discount{o.loyaltyPoints ? ` (${o.loyaltyPoints} pts)` : ""}</span><b>−{money(o.discount)}</b></div> : null}
        <div className="summary-item" style={{ fontFamily: "var(--serif)", fontSize: "1.15rem" }}><span>{t("total")}</span><b>{money(o.total)}</b></div>
      </div>
    </div></div>
  );
}