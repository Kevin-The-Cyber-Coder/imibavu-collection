import { useEffect, useState } from "react";
import { state, init, closePanels, applyShopNav, applyBrandNav, setCurProduct, loadLoyalty } from "./store";
import { prod } from "./store";
import Layout from "./components/Layout";
import PortalShell, { parseRoute } from "./components/Portal";
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
import Login from "./pages/Login";
import Static from "./pages/Static";
import AdminHome from "./pages/portal/AdminHome";
import StaffDashboard, { StaffOrders, StaffInventory, StaffSupport, StaffMarketing } from "./pages/portal/Staff";
import Account from "./pages/portal/Account";
import {
  AdminProducts, AdminInventory, AdminOrders, AdminCustomers, AdminEmployees,
  AdminMarketing, AdminBookings, AdminQuiz, AdminBrands, AdminReviews,
  AdminReports, AdminSettings, AdminAudit, AdminProfile,
} from "./pages/portal/AdminPages";

const BASE = "Imibavu Collection";
const TITLES = {
  shop: "Shop", brands: "Brands", blends: "Custom Blends", quiz: "Scent Finder",
  about: "About", visit: "Visit Us", faq: "FAQ", checkout: "Checkout",
  account: "My account", admin: "Dashboard", staff: "Employee dashboard",
  login: "Sign in", order: "Order",
};

/* Admin sub-page lookup — #/admin/<page>. */
const ADMIN_PAGES = {
  "": AdminHome,
  products: AdminProducts,
  inventory: AdminInventory,
  orders: AdminOrders,
  customers: AdminCustomers,
  reviews: AdminReviews,
  employees: AdminEmployees,
  marketing: AdminMarketing,
  bookings: AdminBookings,
  quiz: AdminQuiz,
  brands: AdminBrands,
  reports: AdminReports,
  settings: AdminSettings,
  audit: AdminAudit,
  profile: AdminProfile,
};

const STAFF_PAGES = {
  "": StaffDashboard,
  orders: StaffOrders,
  inventory: StaffInventory,
  products: StaffInventory,
  support: StaffSupport,
  marketing: StaffMarketing,
};

/* A customer-facing page inside the storefront chrome. */
function StorefrontView({ seg, params }) {
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
    case "login": return <Login mode={params.get("mode") || "login"} />;
    case "page": return <Static slug={seg[1]} />;
    default: return <Home />;
  }
}

export default function App() {
  const [, force] = useState(0);

  useEffect(() => {
    init();
    const onHash = () => force(n => n + 1);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const route = parseRoute();
  const { seg, params, path } = route;

  useEffect(() => {
    closePanels();
    if (seg[0] === "shop") applyShopNav({ cat: params.get("cat"), col: params.get("col"), brand: params.get("brand"), q: params.get("q") });
    else if (seg[0] === "brands") applyBrandNav(params.get("brand") || "");
    else if (seg[0] === "product") setCurProduct(seg[1]);
    else if (seg[0] === "checkout" && state.user && state.user.id && !state.loyalty) loadLoyalty();
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (seg[0] === "blends" && params.get("book")) {
      const timer = setTimeout(() => {
        const b = document.getElementById("book");
        if (b) b.scrollIntoView({ behavior: "smooth" });
      }, 60);
      return () => clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [path, params.get("book")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let title = BASE;
    if (!seg.length) title = `${BASE} — Perfume Shop Kigali | Oils, Custom Blends & Jewelry`;
    else if (seg[0] === "product") title = `${(prod(seg[1]) || {}).name || "Product"} — ${BASE}`;
    else if (TITLES[seg[0]]) title = `${TITLES[seg[0]]} — ${BASE}`;
    document.title = title;

    /* The storefront nav highlighting only matters outside the portals. */
    document.querySelectorAll(".main-nav a").forEach(a => {
      a.classList.toggle("active", a.dataset.nav === (seg[0] || "home") && a.dataset.nav !== "shop");
      if (a.dataset.nav === "shop") {
        a.classList.toggle("active", ["shop", "brands", "product", "checkout", "order"].includes(seg[0]));
      }
    });
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- portals get their own chrome (no storefront header) ---------- */
  const isAdmin = seg[0] === "admin";
  const isStaff = seg[0] === "staff";

  if (isAdmin || isStaff) {
    /* A signed-in employee who lands on #/admin gets the employee workspace. */
    const staffOnAdmin = isAdmin && state.user && state.user.role === "staff";
    const pages = (isStaff || staffOnAdmin) ? STAFF_PAGES : ADMIN_PAGES;
    const Page = pages[seg[1] || ""] || pages[""];

    if (!state.user) {
      return (
        <Layout>
          <PortalShell route={isStaff ? route : { ...route, seg: ["staff"] }}>
            <div className="access-denied">
              <h2>Sign in required</h2>
              <p className="muted">This workspace is only for Imibavu staff and administrators.</p>
              <a className="btn" href="#/login">Sign in</a>
              <a className="btn ghost sm" href="#/">Back to the shop</a>
            </div>
          </PortalShell>
        </Layout>
      );
    }

    return (
      <PortalShell route={isStaff || staffOnAdmin ? { ...route, seg: ["staff", ...route.seg.slice(1)] } : route}>
        <Page />
      </PortalShell>
    );
  }

  return (
    <Layout>
      <StorefrontView seg={seg} params={params} />
    </Layout>
  );
}
