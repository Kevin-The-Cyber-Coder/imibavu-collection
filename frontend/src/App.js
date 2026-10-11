import { useEffect, useState } from "react";
import { useStore, state, init, closePanels, applyShopNav, applyBrandNav, setCurProduct, loadLoyalty } from "./store";
import { prod } from "./store";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Product from "./pages/Product";
import Brands from "./pages/Brands";
import Blends from "./pages/Blends";
import Quiz from "./pages/Quiz";
import About from "./pages/About";
import Visit from "./pages/Visit";
import Faq from "./pages/Faq";
import Checkout from "./pages/Checkout";
import OrderPage from "./pages/OrderPage";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import Static from "./pages/Static";

const BASE = "Imibavu Collection";
const TITLES = { shop: "Shop", brands: "Brands", blends: "Custom Blends", quiz: "Scent Finder", about: "About", visit: "Visit Us", faq: "FAQ", checkout: "Checkout", account: "Account", admin: "Back Office", order: "Order" };

function View() {
  useStore();
  const { path, seg, params } = parseHash2();
  switch (seg[0]) {
    case undefined: return <Home />;
    case "shop": return <Shop p={params.get("cat") || params.get("col") || "all"} />;
    case "product": return <Product />;
    case "brands": return <Brands />;
    case "blends": return <Blends />;
    case "quiz": return <Quiz />;
    case "about": return <About />;
    case "visit": return <Visit />;
    case "faq": return <Faq />;
    case "checkout": return <Checkout />;
    case "order": return <OrderPage code={seg[1]} />;
    case "account": return <Account />;
    case "admin": return <Admin />;
    case "page": return <Static slug={seg[1]} />;
    default: return <Home />;
  }
}

function parseHash2() {
  const raw = (typeof window !== "undefined" ? window.location.hash.slice(1) : "/") || "/";
  const [path, qs] = raw.split("?");
  return { path, seg: path.split("/").filter(Boolean), params: new URLSearchParams(qs || "") };
}

export default function App() {
  const [, force] = useState(0);

  useEffect(() => {
    init();
    window.addEventListener("hashchange", () => force(n => n + 1));
    return () => window.removeEventListener("hashchange", () => null);
  }, []);

  const { path, seg, params } = parseHash2();

  useEffect(() => {
    closePanels();
    if (seg[0] === "shop") applyShopNav({ cat: params.get("cat"), col: params.get("col"), brand: params.get("brand"), q: params.get("q") });
    else if (seg[0] === "brands") applyBrandNav(params.get("brand") || "");
    else if (seg[0] === "product") setCurProduct(seg[1]);
    else if (seg[0] === "checkout" && state.user && state.user.id && !state.loyalty) loadLoyalty();
  }, [path]);

  useEffect(() => {
    if (seg[0] === "blends" && params.get("book")) {
      const t = setTimeout(() => { const b = document.getElementById("book"); if (b) b.scrollIntoView({ behavior: "smooth" }); }, 60);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [path, params.get("book")]);

  useEffect(() => {
    let t = BASE;
    if (!seg.length) t = `${BASE} — Perfume Shop Kigali | Oils, Custom Blends & Jewelry`;
    else if (seg[0] === "product") t = `${(prod(seg[1]) || {}).name || "Product"} — ${BASE}`;
    else if (TITLES[seg[0]]) t = `${TITLES[seg[0]]} — ${BASE}`;
    document.title = t;
    document.querySelectorAll(".main-nav a").forEach(a => {
      a.classList.toggle("active", a.dataset.nav === (seg[0] || "home") && a.dataset.nav !== "shop");
      if (a.dataset.nav === "shop") a.classList.toggle("active", seg[0] === "shop" || seg[0] === "brands" || seg[0] === "product" || seg[0] === "checkout" || seg[0] === "order");
    });
  }, [path]);

  return (
    <Layout>
      <View />
    </Layout>
  );
}