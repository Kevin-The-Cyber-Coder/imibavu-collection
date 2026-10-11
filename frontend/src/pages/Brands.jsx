import { useStore, state, vis } from "../store";
import { t } from "../i18n";
import { BRANDS, PRODUCTS } from "../data";
import SectionHead from "../components/SectionHead";
import ProductCard from "../components/ProductCard";

export default function Brands() {
  useStore();
  const trend = PRODUCTS.filter(p => vis(p) && p.trending).slice(0, 4);
  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Browse</span><h1>{t("nav_brands")}</h1>
        <p>Trending Arabic houses and designer-inspired names, plus the Imibavu line of oils and jewelry.</p>
      </div></section>
      <div className="page-body"><div className="container">
        <div className="brand-grid">
          {BRANDS.map(b => {
            const n = PRODUCTS.filter(p => vis(p) && p.brand === b.id).length;
            return (
              <a className="brand-card" key={b.id} href={"#/shop?brand=" + encodeURIComponent(b.id)}>
                <div className="b-mark">{b.name}</div><div className="b-tag">{b.tag}</div>
                <div className="b-count">{n} products</div>
              </a>
            );
          })}
        </div>
        <section className="section">
          <SectionHead title={t("featured")} sub="Most requested brands right now." href="#/shop?col=trending" moreKey="see_all" />
          <div className="product-grid">{trend.map(p => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      </div></div>
    </>
  );
}