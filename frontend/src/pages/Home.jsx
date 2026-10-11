import { useStore, state, vis } from "../store";
import { t } from "../i18n";
import { CATEGORIES, COLLECTIONS, DELIVERY_PROMO, TESTIMONIALS, ARTICLES, PRODUCTS, PAST_BLENDS } from "../data";
import { waLink, realImg } from "../utils";
import { FaWhatsapp, FiCheck, FiTruck, FiZap, FiCreditCard, FiArrowUpRight } from "../components/Icons";
import ProductCard from "../components/ProductCard";
import SectionHead from "../components/SectionHead";
import ProductImage from "../components/ProductImage";
import Stars from "../components/Stars";

const CAT_BG = { perfumes: "#4a3b2c,#17120e", oils: "#5a4a2c,#1b160f", jewelry: "#413a4f,#161320" };

export default function Home() {
  useStore();
  const trending = PRODUCTS.filter(p => vis(p) && p.trending).slice(0, 4);
  const fresh = PRODUCTS.filter(p => vis(p) && p.isNew).slice(0, 4);
  return (
    <>
      <section className="hero">
        <div className="hero-art" />
        <div className="hero-bottle-wrap"><ProductImage product={PRODUCTS[0]} className="hero-bottle" alt="" /></div>
        <div className="container hero-inner">
          <span className="kicker">{t("hero_kicker")}</span>
          <h1>{t("hero_title")}</h1>
          <p>{t("hero_sub")}</p>
          <div className="hero-cta">
            <a className="btn" href="#/shop">{t("hero_cta")}</a>
            <a className="btn wa-btn" target="_blank" rel="noopener noreferrer" href={waLink("Hello Imibavu Collection, I would like help choosing a perfume.")}>
              <FaWhatsapp /> {t("hero_cta2")}
            </a>
          </div>
        </div>
      </section>

      <div className="trust-strip"><div className="container">
        <span>✓ {t("trust1")}</span><span>✓ {t("trust2")}</span><span>✓ {t("trust3")}</span><span>✓ {t("trust4")}</span>
      </div></div>

      <section className="section"><div className="container">
        <div className="cat-grid">
          {CATEGORIES.map(c => (
            <a className="cat-card" key={c.id} href={`#/shop?cat=${c.id}`} style={{ "--cat-bg": `linear-gradient(140deg,${CAT_BG[c.id]})` }}>
              <span className="arrow"><FiArrowUpRight /></span>
              <h3>{t("cat_" + c.id)}</h3><p>{t("cat_" + c.id + "_sub")}</p>
            </a>
          ))}
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container">
        <SectionHead title={t("featured")} sub="Lattafa, Mousuf & more — the scents everyone is asking for." href="#/shop?col=trending" moreKey="see_all" />
        <div className="product-grid">{trending.map(p => <ProductCard key={p.id} p={p} />)}</div>
      </div></section>

      <section className="section" style={{ background: "var(--bg-2)", borderBlock: "1px solid var(--line)" }}><div className="container">
        <SectionHead title={t("collections")} href="#/shop" moreKey="see_all" />
        <div className="coll-grid">
          {COLLECTIONS.map(c => {
            const n = PRODUCTS.filter(p => vis(p) && c.match(p)).length;
            return (
              <a className="coll-card" key={c.id} href={`#/shop?col=${c.id}`}>
                <span>{n} {t("nav_shop").toLowerCase()}</span><b>{c.label}</b>
              </a>
            );
          })}
        </div>
      </div></section>

      <section className="section"><div className="container">
        <SectionHead title={t("new_arrivals")} href="#/shop?col=new" moreKey="see_all" />
        <div className="product-grid">{fresh.map(p => <ProductCard key={p.id} p={p} />)}</div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container">
        <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="promo-card">
            <span className="kicker" style={{ color: "#221a0c" }}>{t("promo_title")}</span>
            <b>{DELIVERY_PROMO.text}</b>
            <span>Use at checkout when ordering online, or mention it in store.</span>
            <span className="promo-code">{DELIVERY_PROMO.code}</span>
          </div>
          <div className="card-box" style={{ display: "grid", gap: 18, alignItems: "center", gridTemplateColumns: "1fr" }}>
            <div>
              <span className="kicker">{t("nav_blends")}</span>
              <h3 style={{ margin: ".3em 0 .3em" }}>{t("blends_title")}</h3>
              <p className="muted">{t("blends_sub")}</p>
              <a className="btn gold" href="#/blends">{t("blend_builder")}</a>
            </div>
            <div className="gallery-grid">
              {PAST_BLENDS.slice(0, 2).map(b => (
                <div key={b.name} className="gallery-item"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.55)), url(${realImg("blend-" + b.name.split(" ")[0].toLowerCase(), 700, 700)})`, backgroundSize: "cover" }}>
                  <div><b>{b.name}</b><span>{b.notes}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div></section>

      <section className="section" style={{ background: "var(--ink)", color: "#efe6d6" }}><div className="container">
        <div className="section-head"><div><h2 style={{ color: "#fff" }}>{t("trust_title")}</h2><p style={{ color: "#a99e8e" }}>Why customers across Kigali keep coming back.</p></div></div>
        <div className="trust-grid">
          {[
            [<FiCheck key="1" />, t("trust1")],
            [<FiTruck key="2" />, t("trust2")],
            [<FiZap key="3" />, t("trust3")],
            [<FiCreditCard key="4" />, t("trust4")],
          ].map(([i, x], idx) => (
            <div key={idx} className="trust-item" style={{ background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)" }}>
              <div className="t-ico" style={{ background: "rgba(255,255,255,.08)" }}>{i}</div>
              <b style={{ color: "#f0e7d7" }}>{x}</b>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 34 }}>
          <a className="btn gold" href="#/quiz">{t("quiz_title")} — {t("quiz_sub").split(" ").slice(0, 3).join(" ")}…</a>
        </div>
      </div></section>

      <section className="section"><div className="container">
        <SectionHead title={t("reviews_title")} sub="Real customers, real Kigali." />
        <div className="testi-scroll">
          {TESTIMONIALS.slice(0, 3).map(r => (
            <div className="testi" key={r.name}>
              <div className="review-head"><div className="avatar">{r.img}</div><div><b>{r.name}</b><Stars r={r.stars} /></div></div>
              <p>“{r.text}”</p>
            </div>
          ))}
        </div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container">
        <SectionHead title={t("care_tips")} href="#/page/care" moreKey="see_all" />
        <div className="article-grid">{ARTICLES.map(a => <article className="article" key={a.title}><h4>{a.title}</h4><p>{a.text}</p></article>)}</div>
      </div></section>

      <section className="section" style={{ paddingTop: 0 }}><div className="container">
        <div className="news-band">
          <span className="kicker">{t("nav_shop")} · Kigali</span>
          <h3>{t("newsletter")}</h3>
          <p>{t("newsletter_sub")}</p>
          <form className="news-form" onSubmit={e => { e.preventDefault(); e.currentTarget.reset(); }}>
            <input type="text" placeholder={t("phone_num")} required /><button className="btn gold" type="submit">{t("subscribe")}</button>
          </form>
        </div>
      </div></section>
    </>
  );
}