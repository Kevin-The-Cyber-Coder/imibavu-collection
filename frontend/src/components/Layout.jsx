import { useState } from "react";
import { useStore, state, closePanels, openPanel, setLang, setSearchQuery, cartCount, cartSubtotal, prod, syncCart, setQty, cartRemove, newsSignup } from "../store";
import { t } from "../i18n";
import { STORE, DELIVERY_PROMO, PRODUCTS } from "../data";
import { brandName, money, waLink, sizeLabel } from "../utils";
import { FiSearch, FiUser, FiShoppingBag, FiMenu, FiX, FiPlus, FiMinus, FaWhatsapp } from "./Icons";
import ProductImage from "./ProductImage";

function PromoBanner() {
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div className="promo-banner" role="banner">
      <p dangerouslySetInnerHTML={{ __html: `${DELIVERY_PROMO.text} · Code <b>${DELIVERY_PROMO.code}</b>` }} />
      <button className="promo-close" aria-label="Close promotion" onClick={() => setGone(true)}><FiX /></button>
    </div>
  );
}

function Header() {
  useStore();
  const [sq, setSq] = useState("");
  const q = sq.trim().toLowerCase();
  const hits = q.length >= 2
    ? PRODUCTS.filter(p => !state.hidden.includes(p.id) && (p.name + " " + brandName(p.brand) + " " + p.family).toLowerCase().includes(q)).slice(0, 6)
    : [];
  const count = cartCount();
  return (
    <header className="site-header">
      <div className="container header-inner">
        <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => openPanel("mobile")}>
          <span /><span /><span />
        </button>
        <a className="logo" href="#/" aria-label="Imibavu Collection home">
          <img className="logo-mark" src={process.env.PUBLIC_URL + "/logo.jpg"} alt="Imibavu Collection logo" />
          <span className="logo-text">Imibavu<em>Collection</em></span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#/" data-nav="home">{t("nav_home")}</a>
          <a href="#/shop" data-nav="shop">{t("nav_shop")}</a>
          <a href="#/brands" data-nav="brands">{t("nav_brands")}</a>
          <a href="#/blends" data-nav="blends">{t("nav_blends")}</a>
          <a href="#/about" data-nav="about">{t("nav_about")}</a>
          <a href="#/visit" data-nav="visit">{t("nav_visit")}</a>
          <a href="#/faq" data-nav="faq">{t("nav_faq")}</a>
        </nav>
        <div className="header-actions">
          <label className="lang-switch" aria-label="Language">
            <select value={state.lang} onChange={e => setLang(e.target.value)}>
              <option value="en">EN</option>
              <option value="rw">RW</option>
              <option value="fr">FR</option>
            </select>
          </label>
          <button className="icon-btn" aria-label="Search" aria-expanded={state.panel.search}
            onClick={() => { setSq(""); state.panel.search ? closePanels() : openPanel("search"); }}>
            <FiSearch />
          </button>
          <a className="icon-btn" href="#/account" aria-label="Account"><FiUser /></a>
          <button className="icon-btn cart-btn" aria-label="Open cart" onClick={() => { syncCart(); openPanel("cart"); }}>
            <FiShoppingBag />
            <span className="cart-count">{count}</span>
          </button>
        </div>
      </div>
      {state.panel.search && (
        <div className="search-panel">
          <div className="container search-inner">
            <input
              type="search"
              value={sq}
              placeholder={t("search_ph")}
              autoFocus
              autoComplete="off"
              aria-label="Search products"
              onChange={e => setSq(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  setSearchQuery(sq.trim());
                  closePanels();
                  window.location.hash = "#/shop?q=" + encodeURIComponent(sq.trim());
                } else if (e.key === "Escape") closePanels();
              }}
            />
            <div className="search-suggest" role="listbox">
              {q.length >= 2 && (hits.length
                ? hits.map(p => (
                    <div className="sug-item" key={p.id} onClick={() => { closePanels(); window.location.hash = "#/product/" + p.id; }}>
                      <ProductImage product={p} alt="" />
                      <div><b>{p.name}</b><span>{brandName(p.brand)} · {money(p.price)}</span></div>
                    </div>
                  ))
                : <div className="sug-item"><span>{t("no_results")}</span></div>)}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MobileNav() {
  useStore();
  return (
    <aside className={`mobile-nav ${state.panel.mobile ? "open" : ""}`} aria-hidden={!state.panel.mobile} aria-label="Mobile navigation">
      <div className="mobile-nav-head">
        <img className="logo-mark" src={process.env.PUBLIC_URL + "/logo.jpg"} alt="Imibavu Collection logo" />
        <button className="icon-btn" aria-label="Close menu" onClick={closePanels}><FiX /></button>
      </div>
      <nav>
        <a href="#/" onClick={closePanels}>{t("nav_home")}</a>
        <a href="#/shop" onClick={closePanels}>{t("nav_shop")}</a>
        <a href="#/brands" onClick={closePanels}>{t("nav_brands")}</a>
        <a href="#/blends" onClick={closePanels}>{t("nav_blends")}</a>
        <a href="#/about" onClick={closePanels}>{t("nav_about")}</a>
        <a href="#/visit" onClick={closePanels}>{t("nav_visit")}</a>
        <a href="#/faq" onClick={closePanels}>{t("nav_faq")}</a>
        <a href="#/quiz" onClick={closePanels}>{t("quiz_title")}</a>
        <a href="#/account" onClick={closePanels}>{t("account")}</a>
        <a href="#/admin" onClick={closePanels}>{t("admin")}</a>
      </nav>
      <a className="btn wa-btn full" href={waLink("Hello Imibavu Collection, I would like help choosing a perfume.")} target="_blank" rel="noopener noreferrer">
        <FaWhatsapp /> WhatsApp {STORE.phonePretty}
      </a>
      <div className="mobile-nav-foot"><p>{t("hero_kicker")}</p></div>
    </aside>
  );
}

function CartDrawer() {
  useStore();
  const sub = cartSubtotal();
  return (
    <aside className={`cart-drawer ${state.panel.cart ? "open" : ""}`} aria-hidden={!state.panel.cart} aria-label="Shopping cart">
      <div className="cart-head">
        <h3>{t("cart_title")} <small className="muted">({cartCount()})</small></h3>
        <button className="icon-btn" aria-label="Close cart" onClick={closePanels}><FiX /></button>
      </div>
      <div className="cart-body">
        {!state.cart.length
          ? <div className="cart-empty">{t("cart_empty")}<br /><br /><a className="btn ghost sm" href="#/shop" onClick={closePanels}>{t("back_shop")}</a></div>
          : state.cart.map((i, idx) => {
              const p = prod(i.pid); if (!p) return null;
              return (
                <div className="cart-item" key={p.id + "-" + i.size}>
                  <ProductImage product={p} alt={p.name} />
                  <div className="ci-info">
                    <b>{p.name}</b>
                    <span className="ci-meta">{brandName(p.brand)} · {sizeLabel(p.sizes[i.size])}</span>
                    <span className="ci-price">{money(p.sizes[i.size][1] * i.qty)}</span>
                    <span className="qty">
                      <button aria-label="Decrease" onClick={() => setQty(idx, -1)}><FiMinus /></button>
                      <span>{i.qty}</span>
                      <button aria-label="Increase" onClick={() => setQty(idx, 1)}><FiPlus /></button>
                    </span>
                  </div>
                  <button className="ci-remove" aria-label="Remove" onClick={() => cartRemove(idx)}><FiX /></button>
                </div>
              );
            })}
      </div>
      {state.cart.length > 0 && (
        <div className="cart-foot">
          <div className="cart-line"><span>{t("subtotal")}</span><b>{money(sub)}</b></div>
          <div className="cart-line muted"><span>{t("delivery")}</span><span>{sub >= 60000 ? "Free downtown" : "from 1,500 RWF"}</span></div>
          <a className="btn full" href="#/checkout" onClick={closePanels}>{t("checkout")}</a>
          <a
            className="btn wa-btn full"
            style={{ marginTop: 8 }}
            target="_blank"
            rel="noopener noreferrer"
            href={waLink("Hello Imibavu Collection, I would like to order:\n" + state.cart.map(i => { const p = prod(i.pid); return `• ${p.name} (${sizeLabel(p.sizes[i.size])}) × ${i.qty} — ${money(p.sizes[i.size][1] * i.qty)}`; }).join("\n") + `\n\nTotal: ${money(sub)}`)}
          ><FaWhatsapp /> {t("buy_whatsapp")}</a>
        </div>
      )}
    </aside>
  );
}

function Footer() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-grid">
        <div className="f-col f-brand">
          <a className="logo" href="#/" aria-label="Imibavu Collection home">
            <img className="logo-mark" src={process.env.PUBLIC_URL + "/logo.jpg"} alt="Imibavu Collection logo" />
            <span className="logo-text">Imibavu<em>Collection</em></span>
          </a>
          <p>{t("brand_tagline")}</p>
          <p className="f-addr">Ground floor, T2000 Building,<br />Downtown Kigali, Rwanda</p>
          <div className="f-social">
            <a href={STORE.socials.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href={STORE.socials.tiktok} target="_blank" rel="noopener noreferrer">TikTok</a>
            <a href={STORE.socials.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
          </div>
        </div>
        <div className="f-col">
          <h4>{t("nav_shop")}</h4>
          <a href="#/shop?cat=perfumes">{t("cat_perfumes")}</a>
          <a href="#/shop?cat=oils">{t("cat_oils")}</a>
          <a href="#/shop?cat=jewelry">{t("cat_jewelry")}</a>
          <a href="#/shop?col=summer">Summer Long-Lasting</a>
          <a href="#/shop?col=gifts">{t("gift_title")}</a>
        </div>
        <div className="f-col">
          <h4>{t("nav_blends")}</h4>
          <a href="#/blends">{t("blend_builder")}</a>
          <a href="#/blends?book=1">{t("book_session")}</a>
          <a href="#/quiz">{t("quiz_title")}</a>
          <a href="#/faq">{t("nav_faq")}</a>
          <a href="#/about">{t("nav_about")}</a>
        </div>
        <div className="f-col">
          <h4>{t("visit_title")}</h4>
          <p>T2000 Building, ground floor<br />Downtown Kigali</p>
          <a href={"tel:+" + STORE.phone}>{STORE.phonePretty}</a>
          <a href={waLink("Hello Imibavu Collection!")} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <p className="f-hours">Mon–Fri 08:30–19:30<br />Sat 09:00–20:00 · Sun 12:00–18:00</p>
        </div>
        <div className="f-col f-news">
          <h4>{t("newsletter")}</h4>
          <p>{t("newsletter_sub")}</p>
          <form
            className="news-form"
            onSubmit={e => {
              e.preventDefault();
              e.currentTarget.reset();
              newsSignup();
            }}
          >
            <input type="text" placeholder={t("phone_num")} required aria-label="Phone or email" />
            <button className="btn" type="submit">{t("subscribe")}</button>
          </form>
        </div>
      </div>
      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} Imibavu Collection. <span>{t("tax_note")}</span></p>
        <div className="f-legal">
          <a href="#/page/returns">Returns & Exchanges</a>
          <a href="#/page/privacy">Privacy Policy</a>
          <a href="#/page/authenticity">Authenticity</a>
          <a href="#/admin">{t("admin")}</a>
        </div>
      </div>
    </footer>
  );
}

export default function Layout({ children }) {
  useStore();
  const anyOpen = state.panel.cart || state.panel.mobile || state.panel.search;
  return (
    <>
      <PromoBanner />
      <Header />
      <div className={`overlay ${anyOpen ? "show" : ""}`} style={anyOpen ? undefined : { display: "none" }} onClick={closePanels} />
      <MobileNav />
      <CartDrawer />
      <main id="app" className="app-main" role="main">{children}</main>
      <Footer />
      <a className="wa-float" href={waLink("Hello Imibavu Collection, I would like help choosing a perfume.")} target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp">
        <FaWhatsapp />
      </a>
      <div className={`toast ${state.toast ? "show" : ""}`} role="status" aria-live="polite">{state.toast ? state.toast.msg : ""}</div>
    </>
  );
}