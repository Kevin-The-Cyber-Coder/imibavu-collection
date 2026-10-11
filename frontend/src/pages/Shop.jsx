import { useMemo, useState } from "react";
import { useStore, state, setFilter, setFilterDirect, clearFilters, filterProducts } from "../store";
import { t } from "../i18n";
import { BRANDS, CATEGORIES, COLLECTIONS, PRODUCTS } from "../data";
import { money } from "../utils";
import ProductCard from "../components/ProductCard";

const CAT_PAGES = {
  all: ["All perfumes, oils & jewelry", "The complete Imibavu Collection display."],
  perfumes: ["Perfumes", "Original, long-lasting designer fragrances for him & her."],
  oils: ["Attar & Oils", "Concentrated attar oils — pure, intense and alcohol-free."],
  jewelry: ["Jewelry", "Finished pieces that complete the look."],
};

export default function Shop({ p }) {
  useStore();
  const [open, setOpen] = useState(false);
  const colP = COLLECTIONS.find(c => c.id === p);
  const meta = CAT_PAGES[p] || (colP ? [colP.label, "Hand-picked from the Imibavu Collection."] : CAT_PAGES.all);
  const list = useMemo(() => filterProducts(), [state.filter, state.hidden]);
  const f = state.filter;
  const brands = BRANDS.filter(br => PRODUCTS.some(pc => pc.brand === br.id));
  return (
    <>
      <section className="page-head">
        <span className="kicker">Authentic Kigali scents</span>
        <h2>{meta[0]}</h2>
        <p>{meta[1]}</p>
      </section>
      <div className="page-body"><div className="container">
        <div className="shop-toolbar">
          <span className="result-count">{list.length} {t("nav_shop").toLowerCase()}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="chip" onClick={() => setOpen(!open)}>{t("filters")}</button>
            <select className="sort-select" value={f.sort} aria-label="Sort order" onChange={e => setFilterDirect("sort", e.target.value)}>
              <option value="trending">{t("sort_recommended")}</option>
              <option value="asc">{t("sort_price_asc")}</option>
              <option value="desc">{t("sort_price_desc")}</option>
              <option value="rating">{t("sort_rating")}</option>
              <option value="newest">{t("sort_newest")}</option>
            </select>
          </div>
        </div>

        {open && (
          <div className="filters-panel">
            <label className="f-label">{t("cat_lbl")}</label>
            <div className="f-opts">
              <button className={`chip ${!f.cat ? "on" : ""}`} onClick={() => setFilter("cat", "")}>{t("all")}</button>
              {CATEGORIES.map(c => <button key={c.id} className={`chip ${f.cat === c.id ? "on" : ""}`} onClick={() => setFilter("cat", c.id)}>{t("cat_" + c.id)}</button>)}
            </div>

            <label className="f-label" style={{ marginTop: 14 }}>{t("brand_lbl")}</label>
            <div className="f-opts">
              <button className={`chip ${!f.brand ? "on" : ""}`} onClick={() => setFilter("brand", "")}>{t("all")}</button>
              {brands.map(br => <button key={br.id} className={`chip ${f.brand === br.id ? "on" : ""}`} onClick={() => setFilter("brand", br.id)}>{br.name}</button>)}
            </div>

            <label className="f-label" style={{ marginTop: 14 }}>{t("price_lbl")}</label>
            <div className="price-range">
              <input type="number" min={0} step={500} placeholder="Min" value={f.min === "" ? "" : f.min} aria-label="Min price" onChange={e => setFilterDirect("min", e.target.value)} />
              <input type="number" min={0} step={500} placeholder="Max" value={f.max === "" ? "" : f.max} aria-label="Max price" onChange={e => setFilterDirect("max", e.target.value)} />
              <span className="muted" style={{ whiteSpace: "nowrap" }}>{money(f.min === "" ? 0 : +f.min)} — {money(f.max === "" ? 400000 : +f.max)}</span>
            </div>
            <button className="btn ghost sm" style={{ marginTop: 14 }} onClick={clearFilters}>{t("reset")}</button>
          </div>
        )}

        {list.length ? <div className="product-grid">{list.map(pr => <ProductCard key={pr.id} p={pr} />)}</div>
          : <div className="empty-state"><h3>{t("no_results")}</h3><p>{t("try_change")}</p></div>}
      </div></div>
    </>
  );
}