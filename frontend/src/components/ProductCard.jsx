import { useStore, addToCart, toggleWish, stockOf, state } from "../store";
import { t } from "../i18n";
import { brandName, money, waLink, waProductMsg } from "../utils";
import { FaWhatsapp, FiHeart } from "./Icons";
import ProductImage from "./ProductImage";
import Stars from "./Stars";

export default function ProductCard({ p }) {
  useStore();
  const st = stockOf(p);
  const wanted = state.wish.includes(p.id);
  return (
    <article className="p-card">
      <div className="p-thumb" onClick={() => { window.location.hash = "#/product/" + p.id; }}>
        <ProductImage product={p} alt={`${p.name} — ${brandName(p.brand)}`} loading="lazy" />
        <div className="badges">
          {p.isNew ? <span className="badge green">New</span> : null}
          {p.trending ? <span className="badge gold">Trending</span> : null}
          {p.inspired ? <span className="badge">{p.inspired}</span> : null}
          {st === "low" ? <span className="badge red">Low stock</span> : null}
          {st === "out" ? <span className="badge out">{t("out_stock")}</span> : null}
        </div>
        <button
          className={`wish-btn ${wanted ? "on" : ""}`}
          onClick={e => { e.stopPropagation(); toggleWish(p.id); }}
          aria-label="Save"
        >
          <FiHeart />
        </button>
      </div>
      <div className="p-body">
        <span className="p-brand">{brandName(p.brand)}</span>
        <h3 className="p-name" onClick={() => { window.location.hash = "#/product/" + p.id; }}>{p.name}</h3>
        <span className="p-meta">
          {p.category === "jewelry" && p.sizes.length === 1
            ? (typeof p.sizes[0][0] === "number" ? p.sizes[0][0] + " ml" : String(p.sizes[0][0]))
            : p.sizes.map(s => typeof s[0] === "number" ? s[0] + " ml" : String(s[0])).join(" · ")} · {p.family}
        </span>
        <span className="p-rating"><Stars r={p.rating} /> {p.rating} ({p.reviews})</span>
        <div className="p-price"><b>{money(p.price)}</b></div>
        <div className="p-actions">
          <button className="btn sm" disabled={st === "out"} onClick={() => addToCart(p.id)}>
            {st === "out" ? t("out_stock") : t("add_cart")}
          </button>
          <a className="btn ghost sm" target="_blank" rel="noopener noreferrer" href={waLink(waProductMsg(p))} aria-label={t("buy_whatsapp")}>
            <FaWhatsapp />
          </a>
        </div>
      </div>
    </article>
  );
}