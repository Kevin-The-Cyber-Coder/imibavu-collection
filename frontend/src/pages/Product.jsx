import { useEffect, useState } from "react";
import { useStore, state, setPdSize, setPdImg, addToCart, toggleWish, loadReviews, submitReview, backInStock, stockOf } from "../store";
import { t } from "../i18n";
import { LONGEVITY, PRODUCTS } from "../data";
import { brandName, money, waLink, prodUrl, sizeLabel } from "../utils";
import { FaWhatsapp } from "../components/Icons";
import ProductImage from "../components/ProductImage";
import ProductCard from "../components/ProductCard";
import Stars from "../components/Stars";

const meter = v => v === "long" ? "●●●" : v === "moderate" ? "●●○" : "●○○";

export default function Product() {
  useStore();
  const p = state.curProduct;
  const [rname, setRname] = useState("");
  const [rtext, setRtext] = useState("");
  const [rstar, setRstar] = useState(5);

  useEffect(() => { if (state.curProduct) loadReviews(state.curProduct.id); }, [state.curProduct && state.curProduct.id]);

  if (!p) return (
    <div className="page-body"><div className="container empty-state">
      <h3>{t("no_results")}</h3><a className="btn ghost" href="#/shop">{t("back_shop")}</a>
    </div></div>
  );

  const st = stockOf(p);
  const sIdx = Math.min(state.pd.size, p.sizes.length - 1);
  const related = PRODUCTS_LIKE(p, false).slice(0, 4);
  const look = PRODUCTS_LIKE(p, true).slice(0, 4);
  const rvs = state.reviews[p.id] || [];
  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="page-body"><div className="container">
      <div className="crumbs">
        <a href="#/">Home</a><span>/</span><a href={"#/shop?cat=" + p.category}>{t("cat_" + p.category)}</a><span>/</span>{p.name}
      </div>
      <div className="pd">
        <div className="pd-gallery">
          <div className="pd-main-img"><ProductImage product={p} view={state.pd.img} alt={p.name} /></div>
          <div className="pd-thumbs">
            {[0, 1, 2].map(i => (
              <button key={i} className={state.pd.img === i ? "on" : ""} onClick={() => setPdImg(i)} aria-label={"View " + (i + 1)}>
                <ProductImage product={p} view={i} alt="" />
              </button>
            ))}
          </div>
        </div>
        <div className="pd-info">
          <span className="p-brand">{brandName(p.brand)}</span>
          <h1>{p.name}</h1>
          <div className="pd-rating"><span className="stars">{p.rating} ★</span> {p.rating} · {p.reviews} {t("reviews")} {p.inspired ? <span className="badge" style={{ position: "static" }}>{p.inspired}</span> : null}</div>
          <div className="pd-price">{money(p.sizes[sIdx][1])} <small>VAT inc.</small></div>
          <p className="pd-desc">{p.desc}</p>

          <div className="stock-line"><span className={"dot " + st} />
            {st === "in" ? t("in_stock") : st === "low" ? t("low_stock") + " — 3 " + t("stock_left") : t("out_stock")}
          </div>

          {p.sizes.length > 1 && (
            <div className="opt-block">
              <span className="f-label">{t("size")}</span>
              <div className="size-opts">
                {p.sizes.map((s, i) => (
                  <button key={i} className={`size-opt ${i === sIdx ? "on" : ""}`} onClick={() => setPdSize(i)} disabled={st === "out"}>
                    {sizeLabel(s)}<small>{money(s[1])}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pd-buy">
            <button className="btn" onClick={() => addToCart(p.id, sIdx)} disabled={st === "out"}>{st === "out" ? t("out_stock") : t("add_cart")}</button>
            <a className="btn wa-btn" target="_blank" rel="noopener noreferrer"
              href={waLink(`Hello Imibavu Collection, I would like to order:\n• ${p.name} — ${brandName(p.brand)}\n• Size: ${sizeLabel(p.sizes[sIdx])} — ${money(p.sizes[sIdx][1])}\n• ${prodUrl(p)}\n\nIs it available?`)}>
              <FaWhatsapp /> {t("buy_whatsapp")}
            </a>
          </div>
          {st === "out" && <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => backInStock(p.id)}>{t("back_in_stock")}</button>}
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <button className={`chip ${state.wish.includes(p.id) ? "on" : ""}`} onClick={() => toggleWish(p.id)}>♥ {state.wish.includes(p.id) ? "Saved" : t("wishlist")}</button>
            <button className="chip" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(url); }}>{t("share")}</button>
          </div>

          <div className="spec-grid">
            <div className="spec"><span className="f-label">{t("gender")}</span><p>{p.gender} · {p.family}</p></div>
            <div className="spec"><span className="f-label">{t("longevity_rating")}</span><p>{meter(p.longevity)}</p></div>
            <div className="spec"><span className="f-label">{t("projection")}</span><p>{meter(p.longevity === "long" ? "moderate" : "light")}</p></div>
            <div className="spec"><span className="f-label">{t("best_for")}</span><p>{p.season}</p></div>
          </div>

          {p.notes && p.notes.top.length ? (
            <div className="notes-block">
              <h4 style={{ margin: "2px 0 10px" }}>Scent pyramid</h4>
              <div className="note-row"><b>{t("top_notes")}</b><span>{p.notes.top.join(" · ")}</span></div>
              <div className="note-row"><b>{t("heart_notes")}</b><span>{p.notes.heart.join(" · ")}</span></div>
              <div className="note-row"><b>{t("base_notes")}</b><span>{p.notes.base.join(" · ")}</span></div>
              <div className="note-row"><b>{t("longevity_rating")}</b><span>{meter(p.longevity)} — {(LONGEVITY.find(l => l.id === p.longevity) || {}).label}</span></div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="reviews-block">
        <div className="section-head"><div><h2>{t("reviews_title")}</h2><p>{p.rating} average from {p.reviews} customers</p></div></div>
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 20 }}>
          <div>
            {rvs.length ? rvs.map(r => (
              <div className="testi" key={r._id || r.id || r.text}>
                <div className="review-head">
                  <div className="avatar">{String(r.name || "U")[0].toUpperCase() || "U"}</div>
                  <div><b>{r.name || "Guest"}</b><Stars r={r.stars} /></div>
                </div>
                <p>{r.text}</p>
              </div>
            )) : <p className="muted">{t("no_reviews")}</p>}
          </div>
          <form className="card-box" onSubmit={e => {
            e.preventDefault();
            submitReview(p.id, { stars: rstar, name: rname, text: rtext });
            setRname(""); setRtext(""); setRstar(5);
          }}>
            <h3 style={{ fontSize: "1.3rem" }}>Write a review</h3>
            <div className="form-grid two" style={{ marginTop: 12 }}>
              <div className="field"><label>{t("full_name")}</label><input name="name" value={rname} onChange={e => setRname(e.target.value)} required /></div>
              <div className="field"><label>Rating</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(x => <button type="button" key={x} aria-label={x + " stars"} onClick={() => setRstar(x)}
                    style={{ color: x <= rstar ? "var(--gold)" : "var(--line-2)", fontSize: 20, background: "none", border: 0, cursor: "pointer", padding: 2 }}>★</button>)}
                </div>
              </div>
            </div>
            <div className="field" style={{ marginTop: 12 }}><label>Your review</label><textarea name="text" value={rtext} onChange={e => setRtext(e.target.value)} required /></div>
            <button className="btn sm" type="submit" style={{ marginTop: 12 }}>{t("post_review")}</button>
          </form>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head"><div><h2>{t("related")}</h2></div><a className="link-more" href={"#/shop?cat=" + p.category}>{t("see_all")}</a></div>
          <div className="product-grid">{related.map(x => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
      {look.length > 0 && (
        <section className="section" style={{ paddingTop: 34 }}>
          <div className="section-head"><div><h2>{t("complete_look")}</h2></div><a className="link-more" href={"#/shop?cat=" + look[0].category}>{t("see_all")}</a></div>
          <div className="product-grid">{look.map(x => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}
    </div></div>
  );
}

function PRODUCTS_LIKE(p, opposite) {
  const cat = opposite ? (p.category === "jewelry" ? "perfumes" : "jewelry") : p.category;
  const brand = opposite ? null : p.brand;
  return PRODUCTS.filter(x => x.id !== p.id && x.category !== undefined && (brand ? x.brand === p.brand : x.category === cat));
}