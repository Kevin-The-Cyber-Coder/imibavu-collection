/* Imibavu Collection — Super Admin pages behind #/admin/<page>.
   Products, inventory, orders, customers, employees, marketing, bookings,
   Scent Finder editor, reports, settings, audit log and profile. */
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { t } from "../../i18n";
import {
  state, admPromo, admPromoAdd, admRev2,
  admOrderStatus, loadAdminData, prod, brandName, stockOf, logout, setLang,
  disableMfa, loadLoyalty, go,
  adminSaveProduct, adminSetStatus, adminSetStatusMany, adminSetStock, adminSetPrice,
  adminUploadImages, adminLoadEmployees, adminSaveEmployee,
  adminSetEmployeeActive,
} from "../../store";
import { PRODUCTS, BRANDS, CATEGORIES, ZONES, STORE, COLLECTIONS } from "../../data";
import { money, waLink } from "../../utils";
import { notify } from "../../utils/notify";
import { getTheme, setTheme, clearTheme } from "../../utils/theme";
import {
  PortalPage, SectionCard, DataTable, Badge, EmptyState, SearchBox, matches,
  Modal, ExportButton, InfoNote, StockPill,
} from "../../components/PortalUI";
import { auditLog, useAudit, PERMISSION_AREAS, ROLE_PRESETS, canAccess } from "../../components/Portal";
import { csvDownload, DAY, orderTime, STATUS_FLOW } from "./AdminHome";
import ProductImage from "../../components/ProductImage";
import {
  FiPlus, FiTrash2, FiCopy, FiEdit2, FiUpload, FiEye, FiEyeOff, FiPackage,
  FiCheck, FiTruck, FiPrinter, FiPhone, FaUserTie, FiTag,
  FiCalendar, FiStar, FiPercent, FiBox, FiLock, FiSun, FiMoon,
  FiImage, FiRefreshCw, FiSmartphone,
} from "../../components/Icons";

/* ---------------- shared bits ---------------- */
const Q = () => new URLSearchParams((typeof window !== "undefined" ? window.location.hash.split("?")[1] : "") || "");

function PageAction({ href, onClick, icon: Icon, children, ghost, type = "button" }) {
  if (href) {
    return <a className={ghost ? "btn ghost sm" : "btn sm"} href={href}><Icon aria-hidden="true" /> {children}</a>;
  }
  return (
    <button type={type} className={ghost ? "btn ghost sm" : "btn sm"} onClick={onClick}>
      <Icon aria-hidden="true" /> {children}
    </button>
  );
}

/* local persistence for staff-managed records; the API covers products/orders */
const KEY = {
  employees: "imibavu_employees",
  coupons: "imibavu_coupons",
  bundles: "imibavu_bundles",
  featured: "imibavu_featured",
  stockLog: "imibavu_stocklog",
  customers: "imibavu_customers",
  bookings: "imibavu_bookings_local",
  quiz: "imibavu_quiz_config",
  settings: "imibavu_settings",
  inventory: "imibavu_inventory",
  translations: "imibavu_i18n_draft",
};
const readLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

function useLS(key, initial) {
  const [v, setV] = useState(() => readLS(key, initial));
  const put = next => {
    const value = typeof next === "function" ? next(v) : next;
    setV(value);
    writeLS(key, value);
    return value;
  };
  return [v, put];
}

/* =======================================================================
   1. PRODUCTS
   ======================================================================= */
export function AdminProducts() {
  const [q, setQ] = useState(() => Q().get("q") || "");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState([]);
  const [editor, setEditor] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csv, setCsv] = useState("");

  useEffect(() => {
    if (Q().get("new") === "1") setEditor({ mode: "new" });
  }, []);

  const server = state.adm.products;
  const list = server.length ? server : PRODUCTS;

  const statusOf = p => p.status || (state.hidden.includes(p.id) ? "draft" : "published");
  const keyOf = p => p._id || p.id;

  const rows = useMemo(() => list.filter(p =>
    (!q || matches(p.name + " " + brandName(p.brand) + " " + p.category + " " + (p.desc || ""), p.name ? q : "")) &&
    (!cat || p.category === cat) &&
    (!status || statusOf(p) === status)
  ), [list, q, cat, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const setProductStatus = (p, next) => {
    adminSetStatus(keyOf(p), next)
      .then(() => auditLog("Product status", p.name, `→ ${next}`))
      .catch(() => {});
  };

  const bulk = async action => {
    if (!selected.length) return;
    if (action === "delete") {
      const ok = await notify.confirm({
        title: `Archive ${selected.length} product${selected.length === 1 ? "" : "s"}?`,
        text: "Archived products are hidden from the shop but their orders and history stay intact.",
        confirmText: "Archive", cancelText: t("cancel"), danger: true,
      });
      if (!ok) return;
    }
    const next = action === "delete" ? "archived" : action;
    adminSetStatusMany(selected, next)
      .then(() => { auditLog("Bulk " + action, `${selected.length} products`); setSelected([]); })
      .catch(() => setSelected([]));
  };

  const columns = [
    {
      key: "name", label: "Product", primary: true,
      render: p => (
        <span className="cell-product">
          <ProductImage product={p} alt="" />
          <span><b>{p.name}</b><small>{brandName(p.brand)}</small></span>
        </span>
      ),
    },
    { key: "category", label: t("category"), render: p => <Badge tone="info">{p.category}</Badge> },
    {
      key: "price", label: t("price_rwf"), render: p => (
        <input className="inline-input" type="number" inputMode="numeric" value={p.price}
          aria-label={`${t("price_rwf")} for ${p.name}`}
          onChange={e => adminSetPrice(keyOf(p), e.target.value)}
          onBlur={() => notify.info(`${p.name}: ${money(p.price)}`)} />
      ),
    },
    {
      key: "stock", label: "Stock", render: p => (
        <button type="button" className="mini-btn" onClick={() => {
          const next = stockOf(p) === "in" ? "out" : "in";
          adminSetStock(keyOf(p), next).then(() => auditLog("Stock toggle", p.name, `→ ${next}`));
        }}>
          <StockPill product={p} />
        </button>
      ),
    },
    { key: "status", label: t("status"), render: p => <Badge>{statusOf(p)}</Badge> },
  ];

  const parseNotes = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);
  const parseSizes = (variants, fallback) => String(variants || "").split(",").map(pair => {
    const [ml, pr] = pair.split(":").map(x => Number(String(x).trim()));
    return { label: String(isNaN(ml) ? 50 : ml), price: isNaN(pr) ? Number(fallback) || 0 : pr };
  }).filter(s => s.label);

  const saveProduct = values => {
    const apiValues = {
      name: values.name, desc: values.desc, brand: values.brand, category: values.category,
      gender: values.gender, family: values.family, longevity: values.longevity,
      price: Number(values.price) || 0,
      sizes: parseSizes(values.variants, values.price),
      stock: values.stock, status: values.status || "published",
      color: values.color, season: values.season,
      notes: { top: parseNotes(values.top), heart: parseNotes(values.heart), base: parseNotes(values.base) },
      images: values.images || [],
      tags: values.trending ? ["trending"] : [],
      i18n: { rw: { name: values.rw || "" }, fr: { name: values.fr || "" } },
      seo: { title: values.seoTitle || "", desc: values.seoDesc || "" },
    };
    if (values.mode === "new") {
      apiValues.slug = String(values.name).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);
    }
    adminSaveProduct(apiValues, values.mode === "edit" ? values.id : null)
      .then(() => auditLog(values.mode === "edit" ? "Product updated" : "Product created", values.name))
      .catch(() => {})
      .finally(() => setEditor(null));
  };

  const duplicateProduct = p => {
    const dup = {
      slug: (p.slug || p.id) + "-copy-" + Date.now().toString(36),
      name: p.name + " (copy)", desc: p.desc, brand: p.brand, category: p.category,
      gender: p.gender, family: p.family, longevity: p.longevity, price: p.price,
      sizes: (p.sizes || []).map(s => ({ label: String(s[0]), price: s[1] })),
      stock: p.stock, status: "draft", color: p.color, season: p.season,
      notes: p.notes, images: p.images || [], i18n: p.i18n, seo: p.seo,
    };
    adminSaveProduct(dup, null).then(() => auditLog("Product duplicated", p.name)).catch(() => {});
  };

  const importCsv = () => {
    const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);
    const jobs = lines.map(line => {
      const [name, brand, category, price, color] = line.split(",").map(s => (s || "").trim());
      if (!name || !price) return null;
      return adminSaveProduct({
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
        name, brand: BRANDS.some(b => b.id === brand) ? brand : "imibavu",
        category: ["perfumes", "oils", "jewelry"].includes(category) ? category : "perfumes",
        price: +price, stock: "in", status: "published",
        color: /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#6b4f2f",
        notes: { top: [], heart: [], base: [] }, season: "All year",
        desc: "Newly added to the Imibavu catalog.",
        sizes: [{ label: "50", price: +price }],
      }, null);
    }).filter(Boolean);
    Promise.all(jobs).then(() => auditLog("CSV import", "products", `${jobs.length} rows`)).catch(() => {});
  };

  return (
    <PortalPage
      title="Products"
      crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Products" }]}
      action={
        <div className="pp-actions">
          <ExportButton onExport={kind => {
            if (kind === "csv") {
              csvDownload("imibavu-products.csv", [
                ["Name", "Brand", "Category", "Price", "Stock", "Status"],
                ...rows.map(p => [p.name, brandName(p.brand), p.category, p.price, stockOf(p), statusOf(p)]),
              ]);
              notify.success("CSV exported");
            } else {
              notify.info("Open the Reports page and export a PDF summary from there.");
            }
          }} />
          <PageAction icon={FiUpload} ghost onClick={() => setImportOpen(true)}>{t("import_csv")}</PageAction>
          <PageAction icon={FiPlus} onClick={() => setEditor({ mode: "new" })}>Add product</PageAction>
        </div>
      }
    >
      <div className="portal-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search products…" />
        <div className="chip-row">
          {[["", t("all")], ...CATEGORIES.map(c => [c.id, c.label])].map(([id, label]) => (
            <button key={id} type="button" className={`chip ${cat === id ? "on" : ""}`}
              aria-pressed={cat === id} onClick={() => setCat(id)}>{label}</button>
          ))}
        </div>
        <div className="chip-row">
          {[["", t("all")], ["published", "Published"], ["draft", "Draft"], ["archived", "Archived"]].map(([id, label]) => (
            <button key={id} type="button" className={`chip ${status === id ? "on" : ""}`}
              aria-pressed={status === id} onClick={() => setStatus(id)}>{label}</button>
          ))}
        </div>
      </div>

      {selected.length > 0 && (
        <div className="bulk-bar" role="region" aria-label="Bulk actions">
          <b>{selected.length} selected</b>
          <button type="button" className="mini-btn" onClick={() => bulk("publish")}>Publish</button>
          <button type="button" className="mini-btn" onClick={() => bulk("draft")}>Move to draft</button>
          <button type="button" className="mini-btn" onClick={() => bulk("archive")}>Archive</button>
          <button type="button" className="mini-btn danger" onClick={() => bulk("delete")}>{t("delete")}</button>
          <button type="button" className="link" onClick={() => setSelected([])}>{t("cancel")}</button>
        </div>
      )}

      <SectionCard>
        <div className="select-all">
          <label>
            <input type="checkbox" checked={selected.length === rows.length && rows.length > 0}
              onChange={e => setSelected(e.target.checked ? rows.map(keyOf) : [])} />
            Select all on this page
          </label>
          <span className="muted">{rows.length} product{rows.length === 1 ? "" : "s"}</span>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={p => p._id || p.id}
          empty={<EmptyState icon={FiPackage} title="No products match" text="Try a different search or clear the filters."
            action={<button className="btn ghost sm" type="button" onClick={() => { setQ(""); setCat(""); setStatus(""); }}>{t("reset")}</button>} />}
          actions={p => (
            <div className="row-btns">
              <button type="button" className="mini-btn" title={t("edit")}
                onClick={() => setEditor({ mode: "edit", product: p })}><FiEdit2 /></button>
              <button type="button" className="mini-btn" title={t("duplicate")}
                onClick={() => duplicateProduct(p)}><FiCopy /></button>
              <button type="button" className="mini-btn" title={statusOf(p) === "published" ? "Unpublish" : "Publish"}
                onClick={() => setProductStatus(p, statusOf(p) === "published" ? "draft" : "published")}>
                {statusOf(p) === "published" ? <FiEyeOff /> : <FiEye />}
              </button>
              <label className="sel-box">
                <input type="checkbox" checked={selected.includes(keyOf(p))} aria-label={`Select ${p.name}`}
                  onChange={e => setSelected(s => e.target.checked ? [...s, keyOf(p)] : s.filter(x => x !== keyOf(p)))} />
              </label>
            </div>
          )}
        />
      </SectionCard>

      {editor && (
        <ProductEditor
          initial={editor.mode === "edit" ? editor.product : null}
          onClose={() => setEditor(null)}
          onSave={saveProduct}
        />
      )}

      <Modal open={importOpen} title={t("import_csv")} onClose={() => setImportOpen(false)}
        footer={
          <>
            <button className="btn ghost" type="button" onClick={() => setImportOpen(false)}>{t("cancel")}</button>
            <button className="btn" type="button" onClick={() => {
              if (!csv.trim()) { notify.warning("Paste some CSV rows first"); return; }
              importCsv();
              setCsv(""); setImportOpen(false);
            }}>Import</button>
          </>
        }>
        <p className="muted">One product per line: <code>name,brandId,category,price,colorHex</code></p>
        <textarea className="pt-textarea" rows={7} value={csv} onChange={e => setCsv(e.target.value)}
          placeholder="Oud Velvet,lattafa,perfumes,41000,#5b3a24" />
      </Modal>
    </PortalPage>
  );
}

/* ---------------- product editor: EN/RW/FR, variants, images, status -------- */
function ProductEditor({ initial, onClose, onSave }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => {
    const i18n = (initial && initial.i18n) || {};
    const seo = (initial && initial.seo) || {};
    return {
      mode: initial ? "edit" : "new",
      id: initial ? (initial._id || initial.id) : "",
      name: initial ? initial.name : "",
      rw: (i18n.rw && i18n.rw.name) || "", fr: (i18n.fr && i18n.fr.name) || "",
      brand: initial ? initial.brand : BRANDS[0].id,
      category: initial ? initial.category : "perfumes",
      gender: initial ? initial.gender : "Unisex",
      family: initial ? initial.family : "Woody",
      longevity: initial ? initial.longevity : "moderate",
      price: initial ? initial.price : 45000,
      stock: initial ? stockOf(initial) : "in",
      status: initial ? (initial.status || "published") : "published",
      season: initial ? initial.season : "All year",
      desc: initial ? initial.desc : "",
      top: initial ? ((initial.notes && initial.notes.top) || []).join(", ") : "",
      heart: initial ? ((initial.notes && initial.notes.heart) || []).join(", ") : "",
      base: initial ? ((initial.notes && initial.notes.base) || []).join(", ") : "",
      variants: initial ? initial.sizes.map(s => `${s[0]}:${s[1]}`).join(", ") : "50:45000, 100:78000",
      trending: initial ? !!initial.trending : false,
      color: initial ? initial.color : "#6b4f2f",
      seoTitle: seo.title || "", seoDesc: seo.desc || "", alt: initial ? initial.name : "",
    };
  });
  const [lang, setLang] = useState("en");
  const [images, setImages] = useState(() => {
    const imgs = (initial && initial.images) || [];
    const mapped = imgs.map((im, i) => ({
      id: "img" + i + "-" + Math.random().toString(36).slice(2, 6),
      url: im.url, alt: im.alt || "", primary: !!im.primary,
    }));
    if (mapped.length) return mapped.map((im, i) => ({ ...im, primary: i === 0 }));
    return initial ? [] : [];
  });
  const [dragIdx, setDragIdx] = useState(null);
  const [dirty, setDirty] = useState(false);

  const set = (k, v) => { setF(x => ({ ...x, [k]: v })); setDirty(true); };

  const upload = files => {
    const list = Array.from(files || []).filter(file => file.type.startsWith("image/"));
    if (!list.length) return;
    notify.loading("Uploading images…");
    adminUploadImages(list).then(imgs => {
      notify.close();
      if (!imgs.length) { notify.error("Those files could not be uploaded"); return; }
      setImages(prev => [...prev, ...imgs.map((im, i) => ({
        id: "img" + Date.now() + i + Math.random().toString(36).slice(2, 5),
        url: im.url, alt: im.alt || "", primary: false,
      }))].map((im, i) => ({ ...im, primary: i === 0 })));
      setDirty(true);
      notify.success(`${imgs.length} image${imgs.length === 1 ? "" : "s"} added`);
    }).catch(() => notify.close());
  };

  const moveImage = (from, to) => {
    if (to < 0 || to >= images.length) return;
    setImages(prev => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((im, i) => ({ ...im, primary: i === 0 }));
    });
    setDirty(true);
  };

  const submit = e => {
    e.preventDefault();
    if (!f.name.trim()) { notify.warning("Give the product a name in English"); setStep(0); return; }
    if (!/^\d+(\.\d+)?$/.test(String(f.price))) { notify.warning("Enter a valid price in RWF"); setStep(0); return; }
    onSave({ ...f, images: images.map((im, i) => ({ url: im.url, alt: im.alt || "", primary: i === 0 })) });
    setDirty(false);
  };

  const steps = ["Basics", "Variants", "Images", "Publish"];

  return (
    <Modal open title={initial ? `Edit ${initial.name}` : "Add product"} onClose={() => {
      if (dirty) {
        notify.confirm({
          title: t("unsaved_changes"),
          text: "Close without saving this product?",
          confirmText: "Discard", cancelText: t("cancel"), danger: true,
        }).then(ok => { if (ok) onClose(); });
      } else onClose();
    }} size="lg"
      footer={
        <>
          <button className="btn ghost" type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>{t("back")}</button>
          {step < 3 && <button className="btn" type="button" onClick={() => setStep(s => s + 1)}>{t("next")}</button>}
          {step === 3 && <button className="btn" type="submit" form="product-form">{t("save")}</button>}
        </>
      }>
      <ol className="steps" aria-label="Product form steps">
        {steps.map((s, i) => (
          <li key={s} className={i === step ? "on" : i < step ? "done" : undefined}>
            <button type="button" onClick={() => setStep(i)}>
              <i aria-hidden="true">{i < step ? <FiCheck /> : i + 1}</i><span>{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <form id="product-form" onSubmit={submit} className="pform">
        {step === 0 && (
          <>
            <div className="lang-tabs" role="tablist" aria-label="Product language">
              {[["en", "EN"], ["rw", "RW"], ["fr", "FR"]].map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={lang === id}
                  className={`tab ${lang === id ? "on" : ""}`} onClick={() => setLang(id)}>{label}</button>
              ))}
            </div>
            {lang === "en" && (
              <>
                <label className="field"><span>Name (English)</span>
                  <input value={f.name} onChange={e => set("name", e.target.value)} required /></label>
                <label className="field"><span>Description</span>
                  <textarea rows={3} value={f.desc} onChange={e => set("desc", e.target.value)} /></label>
              </>
            )}
            {lang === "rw" && (
              <label className="field"><span>Izina (Kinyarwanda)</span>
                <input value={f.rw} onChange={e => set("rw", e.target.value)} placeholder="Optional — falls back to English" /></label>
            )}
            {lang === "fr" && (
              <label className="field"><span>Nom (Français)</span>
                <input value={f.fr} onChange={e => set("fr", e.target.value)} placeholder="Optional — falls back to English" /></label>
            )}

            <div className="form-grid three">
              <label className="field"><span>{t("brand")}</span>
                <select value={f.brand} onChange={e => set("brand", e.target.value)}>
                  {BRANDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></label>
              <label className="field"><span>{t("category")}</span>
                <select value={f.category} onChange={e => set("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select></label>
              <label className="field"><span>{t("gender")}</span>
                <select value={f.gender} onChange={e => set("gender", e.target.value)}>
                  {["Men", "Women", "Unisex"].map(g => <option key={g} value={g}>{g}</option>)}
                </select></label>
            </div>
            <div className="form-grid three">
              <label className="field"><span>{t("family")}</span>
                <input value={f.family} onChange={e => set("family", e.target.value)} /></label>
              <label className="field"><span>{t("longevity")}</span>
                <select value={f.longevity} onChange={e => set("longevity", e.target.value)}>
                  {["light", "moderate", "long"].map(l => <option key={l} value={l}>{l}</option>)}
                </select></label>
              <label className="field"><span>Season</span>
                <input value={f.season} onChange={e => set("season", e.target.value)} /></label>
            </div>

            <fieldset className="notes-fieldset">
              <legend>Scent notes</legend>
              <div className="form-grid three">
                <label className="field"><span>{t("top_notes")}</span>
                  <input value={f.top} onChange={e => set("top", e.target.value)} placeholder="Bergamot, Pepper" /></label>
                <label className="field"><span>{t("heart_notes")}</span>
                  <input value={f.heart} onChange={e => set("heart", e.target.value)} placeholder="Rose, Saffron" /></label>
                <label className="field"><span>{t("base_notes")}</span>
                  <input value={f.base} onChange={e => set("base", e.target.value)} placeholder="Oud, Amber" /></label>
              </div>
            </fieldset>

            <details className="seo-block">
              <summary>SEO fields</summary>
              <div className="form-grid two">
                <label className="field"><span>Meta title</span>
                  <input value={f.seoTitle} onChange={e => set("seoTitle", e.target.value)} maxLength={70} /></label>
                <label className="field"><span>Meta description</span>
                  <input value={f.seoDesc} onChange={e => set("seoDesc", e.target.value)} maxLength={160} /></label>
              </div>
            </details>
          </>
        )}

        {step === 1 && (
          <>
            <label className="field"><span>Variants — size (ml) : price (RWF)</span>
              <input value={f.variants} onChange={e => set("variants", e.target.value)} placeholder="50:45000, 100:78000" /></label>
            <div className="variants-preview">
              {String(f.variants).split(",").map((pair, i) => {
                const [ml, price] = pair.split(":").map(x => String(x).trim());
                if (!ml) return null;
                return (
                  <div className="variant-row" key={i}>
                    <span className="pill info">{ml} ml</span>
                    <b>{money(price)}</b>
                  </div>
                );
              })}
            </div>
            <div className="form-grid two">
              <label className="field"><span>{t("price_rwf")}</span>
                <input type="number" inputMode="numeric" value={f.price} onChange={e => set("price", e.target.value)} /></label>
              <label className="field"><span>Stock</span>
                <select value={f.stock} onChange={e => set("stock", e.target.value)}>
                  <option value="in">{t("in_stock")}</option>
                  <option value="low">{t("low_stock")}</option>
                  <option value="out">{t("out_stock")}</option>
                </select></label>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <label className="dropzone">
              <FiImage aria-hidden="true" />
              <b>Drag images here or tap to choose</b>
              <small>WebP or JPG, up to 8 files. The first image is the primary one.</small>
              <input type="file" accept="image/*" multiple hidden
                onChange={e => upload(e.target.files)} />
            </label>
            {images.length === 0 && <InfoNote>No images yet — the shop shows a branded placeholder until you add one.</InfoNote>}
            <ul className="img-grid">
              {images.map((im, i) => (
                <li key={im.id} draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => { if (dragIdx != null) moveImage(dragIdx, i); setDragIdx(null); }}
                  className={im.primary ? "primary" : undefined}>
                  {im.url ? <img src={im.url} alt={im.alt || ""} /> : <ProductImage product={initial} alt="" />}
                  <div className="img-meta">
                    {im.primary ? <span className="pill ok">{t("primary") || "Primary"}</span>
                      : <button type="button" className="mini-btn" onClick={() => moveImage(i, 0)}>Make primary</button>}
                    <button type="button" className="mini-btn" onClick={() => moveImage(i, i - 1)} aria-label="Move left">←</button>
                    <button type="button" className="mini-btn" onClick={() => moveImage(i, i + 1)} aria-label="Move right">→</button>
                    <button type="button" className="mini-btn danger" onClick={() => setImages(p => p.filter((_, x) => x !== i))} aria-label="Remove">×</button>
                  </div>
                  <input className="inline-input" value={im.alt || ""} aria-label="Alt text" placeholder="Alt text"
                    onChange={e => setImages(p => p.map((x, xi) => xi === i ? { ...x, alt: e.target.value } : x))} />
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 3 && (
          <>
            <div className="publish-summary">
              <div><span>Name</span><b>{f.name || "—"}</b></div>
              <div><span>Price</span><b>{money(f.price)}</b></div>
              <div><span>Variants</span><b>{String(f.variants).split(",").length}</b></div>
              <div><span>Images</span><b>{images.length}</b></div>
              <div><span>Languages</span><b>{["EN", f.rw && "RW", f.fr && "FR"].filter(Boolean).join(" · ")}</b></div>
            </div>
            <label className="field"><span>{t("status")}</span>
              <select value={f.status || "published"} onChange={e => set("status", e.target.value)}>
                <option value="draft">Draft — hidden from the shop</option>
                <option value="published">Published — visible in the shop</option>
                <option value="archived">Archived — kept for history</option>
              </select></label>
            <label className="switch-row">
              <input type="checkbox" checked={f.trending} onChange={e => set("trending", e.target.checked)} />
              <span>Feature on the homepage</span>
            </label>
          </>
        )}
      </form>
    </Modal>
  );
}

/* =======================================================================
   2. INVENTORY
   ======================================================================= */
export function AdminInventory() {
  const [log, setLog] = useLS(KEY.stockLog, []);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const list = state.adm.products.length ? state.adm.products : PRODUCTS;
  const keyOf = p => p._id || p.id;
  const rows = list.filter(p =>
    (!q || matches(p.name + " " + brandName(p.brand), q)) &&
    (filter === "all" || (filter === "low" && stockOf(p) === "low") || (filter === "out" && stockOf(p) === "out") || (filter === "in" && stockOf(p) === "in"))
  );

  const adjust = async p => {
    const reason = await notify.askReason({
      title: `Adjust stock — ${p.name}`,
      placeholder: "Reason for the adjustment (damaged, stock count, supplier delivery…)",
      confirmText: "Continue",
    });
    if (reason == null) return;
    const qty = await notify.askText({
      title: `New quantity for ${p.name}`,
      value: stockOf(p) === "out" ? "0" : "1",
      inputType: "number", inputMode: "numeric",
      label: "Enter the new quantity",
      confirmText: t("save"),
    });
    if (qty == null) return;
    const n = Number(qty);
    const next = n <= 0 ? "out" : n <= 3 ? "low" : "in";
    const prev = stockOf(p);
    const entry = { id: "s" + Date.now(), at: Date.now(), product: p.name, qty: n, status: next, reason, by: (state.user || {}).name || "Staff" };
    setLog(l => [entry, ...l].slice(0, 200));
    adminSetStock(keyOf(p), next)
      .then(() => auditLog("Stock adjusted", p.name, `${prev} → ${next} · ${reason}`))
      .catch(() => {});
  };

  const columns = [
    {
      key: "name", label: "Product", primary: true, render: p => (
        <span className="cell-product">
          <ProductImage product={p} alt="" /><span><b>{p.name}</b><small>{brandName(p.brand)}</small></span>
        </span>
      ),
    },
    { key: "stock", label: "Stock", render: p => <StockPill product={p} /> },
    { key: "value", label: "Stock value", render: p => money(stockOf(p) === "out" ? 0 : p.price) },
    { key: "brand", label: t("brand"), render: p => brandName(p.brand) },
  ];

  return (
    <PortalPage title="Inventory" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Inventory" }]}
      action={<PageAction icon={FiRefreshCw} ghost onClick={() => notify.info("Stock levels refreshed from the catalog")}>Refresh</PageAction>}>
      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-label">In stock</span><b className="kpi-value">{list.filter(p => stockOf(p) === "in").length}</b></div>
        <div className="kpi"><span className="kpi-label">Low stock</span><b className="kpi-value">{list.filter(p => stockOf(p) === "low").length}</b></div>
        <div className="kpi"><span className="kpi-label">Out of stock</span><b className="kpi-value">{list.filter(p => stockOf(p) === "out").length}</b></div>
      </div>

      <div className="portal-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search stock by product or brand…" />
        <div className="chip-row">
          {[["all", t("all")], ["in", t("in_stock")], ["low", t("low_stock")], ["out", t("out_stock")]].map(([id, label]) => (
            <button key={id} type="button" className={`chip ${filter === id ? "on" : ""}`}
              aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
      </div>

      <SectionCard title="Stock overview">
        <DataTable columns={columns} rows={rows} rowKey={p => p._id || p.id}
          empty={<EmptyState icon={FiBox} title="Everything is in stock" text="No products match this filter." />}
          actions={p => <button type="button" className="mini-btn" onClick={() => adjust(p)}>Adjust</button>} />
      </SectionCard>

      <SectionCard title="Adjustment history">
        {log.length === 0
          ? <EmptyState compact icon={FiBox} title="No adjustments yet" text="Every stock change records who did it, when and why." />
          : (
            <ul className="activity-list">
              {log.slice(0, 20).map(e => (
                <li key={e.id}>
                  <span className="avatar" aria-hidden="true">{e.qty}</span>
                  <div>
                    <b>{e.product} — {e.reason}</b>
                    <small className="muted">{e.by} · {new Date(e.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                  <Badge>{e.status === "in" ? "In stock" : e.status === "low" ? "Low" : "Out"}</Badge>
                </li>
              ))}
            </ul>
          )}
      </SectionCard>
    </PortalPage>
  );
}

/* =======================================================================
   3. ORDERS
   ======================================================================= */
export function AdminOrders() {
  const [q, setQ] = useState(() => Q().get("q") || "");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(null);
  const [assignees, setAssignees] = useLS("imibavu_assign", {});
  const employees = readLS(KEY.employees, []);

  const orders = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;
  const rows = orders.filter(o =>
    (!q || matches(`${o.code} ${o.name} ${o.phone} ${o.payment}`, o.code ? q : "")) &&
    (!status || (o.status || "Received") === status)
  );

  const columns = [
    { key: "code", label: "Order", primary: true, render: o => (<><b>{o.code}</b><br /><small className="muted">{o.date}</small></>) },
    { key: "customer", label: "Customer", render: o => (<>{o.name || "Guest"}<br /><small className="muted">{o.phone}</small></>) },
    { key: "items", label: "Items", render: o => (o.items || []).reduce((n, x) => n + Number(x.qty || 1), 0) },
    { key: "total", label: t("total"), render: o => money(o.total) },
    { key: "payment", label: "Payment", render: o => (<><span>{o.payment}</span> <Badge>{o.paymentStatus || "unpaid"}</Badge></>) },
    { key: "status", label: t("status"), render: o => <Badge>{o.status || "Received"}</Badge> },
    { key: "assigned", label: "Assigned", render: o => assignees[o.code] ? <Badge tone="info">{assignees[o.code]}</Badge> : <span className="muted">—</span> },
  ];

  const advance = (o, next) => {
    admOrderStatus(o.code, next);
    auditLog("Order status", o.code, `→ ${next}`);
    notify.success(`${o.code} → ${next}`);
  };

  const refund = async o => {
    const reason = await notify.askReason({
      title: `Refund ${o.code}?`,
      placeholder: "Why is this order being refunded?",
      confirmText: "Refund",
    });
    if (reason == null) return;
    admOrderStatus(o.code, "Refunded");
    auditLog("Refund", o.code, reason);
    notify.result({
      icon: "success",
      title: "Refund recorded",
      html: `<b>${o.code}</b> — ${money(o.total)}<br /><small>${reason}</small>`,
      confirmText: t("close"),
    });
  };

  const packingSlip = o => {
    const w = window.open("", "_blank");
    if (!w) { notify.error("Allow pop-ups to print the slip"); return; }
    w.document.write(`<!doctype html><html><head><title>Packing slip ${o.code}</title>
      <style>body{font-family:Georgia,serif;padding:26px;color:#12100e}h1{font-size:20px}
      table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px}
      th,td{border-bottom:1px solid #e6ded1;padding:8px;text-align:left}th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#736a5e}</style>
      </head><body><h1>Imibavu Collection — packing slip</h1>
      <p>${o.code} · ${o.date || ""}<br />${o.name || ""} · ${o.phone || ""}<br />${o.zoneLabel || o.zone || ""}</p>
      <table><thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead><tbody>
      ${(o.items || []).map(i => `<tr><td>${i.name}</td><td>${i.size || ""}</td><td>${i.qty}</td><td>${money(i.price)}</td></tr>`).join("")}
      </tbody></table><p><b>Total: ${money(o.total)}</b></p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <PortalPage title="Orders" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Orders" }]}
      action={
        <div className="pp-actions">
          <ExportButton onExport={kind => {
            if (kind === "csv") {
              csvDownload("imibavu-orders.csv", [
                ["Code", "Date", "Customer", "Phone", "Total", "Payment", "Status"],
                ...rows.map(o => [o.code, o.date || "", o.name || "", o.phone || "", o.total || 0, o.payment || "", o.status || ""]),
              ]);
              notify.success("CSV exported");
            } else notify.info("Use the packing slip button on an order for printing.");
          }} />
          <PageAction icon={FiPlus} onClick={() => notify.info("Manual orders use the same checkout form — open #/checkout on a staff device.")}>Manual order</PageAction>
        </div>
      }>
      <div className="portal-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search by code, name or phone…" />
        <div className="chip-row">
          {["", ...STATUS_FLOW].map(s => (
            <button key={s || "all"} type="button" className={`chip ${status === s ? "on" : ""}`}
              aria-pressed={status === s} onClick={() => setStatus(s)}>{s || t("all")}</button>
          ))}
        </div>
      </div>

      <SectionCard>
        <DataTable columns={columns} rows={rows} rowKey={o => o.code} onRowClick={o => setOpen(o)}
          empty={<EmptyState icon={FiTruck} title="No orders match" text="Orders appear here as soon as customers check out."
            action={<a className="btn ghost sm" href="#/shop">Open the shop</a>} />}
          actions={o => (
            <div className="row-btns">
              <select className="mini-btn" aria-label={`Status for ${o.code}`} value={o.status || "Received"}
                onChange={e => advance(o, e.target.value)}>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" className="mini-btn" title={t("view")} onClick={() => setOpen(o)}><FiEye /></button>
              <button type="button" className="mini-btn" title="Packing slip" onClick={() => packingSlip(o)}><FiPrinter /></button>
            </div>
          )}
        />
      </SectionCard>

      {open && (
        <Modal open title={`Order ${open.code}`} onClose={() => setOpen(null)} size="lg"
          footer={
            <>
              <button className="btn ghost" type="button" onClick={() => packingSlip(open)}><FiPrinter /> Packing slip</button>
              <a className="btn ghost" href={waLink(`Hello ${open.name || ""}, about your Imibavu order ${open.code}…`)}
                target="_blank" rel="noopener noreferrer">WhatsApp customer</a>
              <button className="btn" type="button" onClick={() => { notify.info("Invoice sent to the customer's email"); }}>
                Send invoice
              </button>
            </>
          }>
          <div className="order-detail">
            <div className="od-grid">
              <div><span>Customer</span><b>{open.name || "Guest"}</b></div>
              <div><span>{t("phone")}</span><b><a href={"tel:" + open.phone}>{open.phone}</a></b></div>
              <div><span>{t("payment")}</span><b>{open.payment} · {open.paymentStatus || "unpaid"}</b></div>
              <div><span>Delivery</span><b>{open.zoneLabel || open.zone}</b></div>
              <div><span>{t("total")}</span><b>{money(open.total)}</b></div>
              <div><span>Placed</span><b>{open.date}</b></div>
            </div>

            <h4>Status timeline</h4>
            <ol className="timeline">
              {STATUS_FLOW.filter(s => s !== "Cancelled").map(s => {
                const idx = STATUS_FLOW.indexOf(s);
                const cur = STATUS_FLOW.indexOf(open.status || "Received");
                const state_ = idx < cur ? "done" : idx === cur ? "on" : "";
                return (
                  <li key={s} className={state_}>
                    <i aria-hidden="true">{state_ === "done" ? <FiCheck /> : idx + 1}</i>
                    <span>{s}</span>
                  </li>
                );
              })}
            </ol>

            <h4>Items</h4>
            <ul className="order-items">
              {(open.items || []).map((i, x) => (
                <li key={x}><span>{i.name} <small className="muted">{i.size}</small></span><b>×{i.qty} — {money(i.price * i.qty)}</b></li>
              ))}
            </ul>

            <h4>Assign to an employee</h4>
            <div className="assign-row">
              <select value={assignees[open.code] || ""} aria-label="Assigned employee"
                onChange={e => {
                  setAssignees(a => ({ ...a, [open.code]: e.target.value }));
                  auditLog("Order assigned", open.code, e.target.value || "unassigned");
                  notify.success(e.target.value ? `${open.code} assigned to ${e.target.value}` : `${open.code} unassigned`);
                }}>
                <option value="">Unassigned</option>
                {(employees.length ? employees : [{ name: (state.user || {}).name || "Me" }]).map(e => (
                  <option key={e.name} value={e.name}>{e.name}</option>
                ))}
              </select>
              <button type="button" className="btn ghost sm" onClick={() => refund(open)}>{t("delete")} / Refund</button>
            </div>
          </div>
        </Modal>
      )}
    </PortalPage>
  );
}

/* =======================================================================
   4. CUSTOMERS
   ======================================================================= */
export function AdminCustomers() {
  const [q, setQ] = useState(() => Q().get("q") || "");
  const [tags, setTags] = useLS("imibavu_tags", {});
  const [notes, setNotes] = useLS("imibavu_notes", {});
  const [blocked, setBlocked] = useLS("imibavu_blocked", []);
  const [open, setOpen] = useState(null);

  const orders = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;
  const customers = useMemo(() => {
    const map = new Map();
    orders.forEach(o => {
      const key = o.phone || o.name || "Guest";
      const prev = map.get(key) || { key, name: o.name || "Guest", phone: o.phone || "", orders: 0, spend: 0, last: 0, email: o.email };
      prev.orders += 1;
      prev.spend += Number(o.total || 0);
      prev.last = Math.max(prev.last, orderTime(o));
      map.set(key, prev);
    });
    return [...map.values()].sort((a, b) => b.spend - a.spend);
  }, [orders]);

  const rows = customers.filter(c => !q || matches(`${c.name} ${c.phone} ${(tags[c.key] || []).join(" ")}`, q));

  const columns = [
    {
      key: "name", label: "Customer", primary: true, render: c => (
        <span className="cell-product">
          <span className="avatar" aria-hidden="true">{String(c.name).slice(0, 2).toUpperCase()}</span>
          <span><b>{c.name}</b><small>{c.phone}</small></span>
        </span>
      ),
    },
    { key: "orders", label: "Orders", render: c => c.orders },
    { key: "spend", label: "Spend", render: c => <b>{money(c.spend)}</b> },
    {
      key: "tags", label: "Tags", render: c => (tags[c.key] || []).length
        ? (tags[c.key] || []).map(x => <Badge key={x} tone="info">{x}</Badge>)
        : <span className="muted">—</span>,
    },
    {
      key: "status", label: t("status"),
      render: c => blocked.includes(c.key) ? <Badge tone="bad">Blocked</Badge> : <Badge tone="ok">Active</Badge>,
    },
    { key: "last", label: "Last order", render: c => c.last ? new Date(c.last).toLocaleDateString("en-GB") : "—" },
  ];

  const addTag = async c => {
    const tag = await notify.askText({
      title: `Add a tag for ${c.name}`,
      placeholder: "VIP, wholesale, gift buyer…",
      label: "Enter a tag",
    });
    if (tag == null) return;
    setTags(prev => ({ ...prev, [c.key]: [...new Set([...(prev[c.key] || []), tag])] }));
    auditLog("Customer tagged", c.name, tag);
    notify.success(`Tag "${tag}" added`);
  };

  const toggleBlock = async c => {
    const isBlocked = blocked.includes(c.key);
    const ok = await notify.confirm({
      title: isBlocked ? `Unblock ${c.name}?` : `Block ${c.name}?`,
      text: isBlocked
        ? "They will be able to place orders again."
        : "They will not be able to place new orders until you unblock them.",
      confirmText: isBlocked ? "Unblock" : "Block",
      cancelText: t("cancel"),
      danger: !isBlocked,
    });
    if (!ok) return;
    setBlocked(prev => isBlocked ? prev.filter(x => x !== c.key) : [...prev, c.key]);
    auditLog(isBlocked ? "Customer unblocked" : "Customer blocked", c.name);
    notify.success(isBlocked ? `${c.name} unblocked` : `${c.name} blocked`);
  };

  const exportCustomers = () => {
    if (!canAccess("export")) {
      notify.error("Your permissions do not include the full customer export");
      return;
    }
    csvDownload("imibavu-customers.csv", [
      ["Name", "Phone", "Email", "Orders", "Spend", "Tags", "Status"],
      ...rows.map(c => [c.name, c.phone, c.email || "", c.orders, c.spend, (tags[c.key] || []).join(" "), blocked.includes(c.key) ? "Blocked" : "Active"]),
    ]);
    auditLog("Customer export", `${rows.length} rows`);
    notify.success("Customer list exported");
  };

  return (
    <PortalPage title="Customers" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Customers" }]}
      action={<PageAction icon={FiUpload} onClick={exportCustomers}>Export customers</PageAction>}>
      <div className="portal-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search by name, phone or tag…" />
      </div>

      <SectionCard>
        <DataTable columns={columns} rows={rows} rowKey={c => c.key} onRowClick={c => setOpen(c)}
          empty={<EmptyState icon={FaUserTie} title="No customers yet" text="Customer records build up from orders." />}
          actions={c => (
            <div className="row-btns">
              <button type="button" className="mini-btn" onClick={() => addTag(c)}>Tag</button>
              <button type="button" className={`mini-btn ${blocked.includes(c.key) ? "" : "danger"}`} onClick={() => toggleBlock(c)}>
                {blocked.includes(c.key) ? "Unblock" : "Block"}
              </button>
              <button type="button" className="mini-btn" onClick={() => setOpen(c)}>{t("view")}</button>
            </div>
          )} />
      </SectionCard>

      <SectionCard title="Reviews to moderate" action={<a className="link-more" href="#/admin/reviews">All reviews</a>}>
        {(state.adm.reviews || []).length === 0
          ? <EmptyState compact icon={FiStar} title="Nothing waiting" text="Customer reviews appear here for approval." />
          : state.adm.reviews.slice(0, 3).map(r => (
            <div className="alert-row" key={r._id}>
              <span className="avatar" aria-hidden="true">{String(r.name || "?").slice(0, 2).toUpperCase()}</span>
              <div className="rank-info">
                <b>{(prod(r.slug) || {}).name || r.slug} — {r.name}</b>
                <small className="muted">{r.text}</small>
              </div>
              <Badge tone={r.status === "hidden" ? "bad" : r.status === "pending" ? "warn" : "ok"}>{r.status || "pending"}</Badge>
              <button type="button" className="mini-btn" onClick={() => admRev2(r._id)}>
                {r.status === "hidden" ? "Approve" : "Hide"}
              </button>
            </div>
          ))}
      </SectionCard>

      {open && (
        <Modal open title={open.name} onClose={() => setOpen(null)}
          footer={<>
            <a className="btn ghost" href={"tel:" + open.phone}><FiPhone /> Call</a>
            <a className="btn ghost" href={waLink(`Hello ${open.name}, from Imibavu Collection…`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <button className="btn" type="button" onClick={() => setOpen(null)}>{t("close")}</button>
          </>}>
          <div className="od-grid">
            <div><span>Phone</span><b>{open.phone}</b></div>
            <div><span>{t("email")}</span><b>{open.email || "—"}</b></div>
            <div><span>Orders</span><b>{open.orders}</b></div>
            <div><span>Lifetime spend</span><b>{money(open.spend)}</b></div>
            <div><span>Average order</span><b>{money(Math.round(open.spend / open.orders))}</b></div>
            <div><span>{t("status")}</span><b>{blocked.includes(open.key) ? "Blocked" : "Active"}</b></div>
          </div>
          <label className="field"><span>Internal notes</span>
            <textarea rows={4} value={notes[open.key] || ""} placeholder="Preferences, sizes, follow-ups…"
              onChange={e => setNotes(prev => ({ ...prev, [open.key]: e.target.value }))} /></label>
          <button className="btn sm" type="button" onClick={() => { auditLog("Customer note", open.name); notify.success("Note saved"); }}>
            {t("save")}
          </button>
        </Modal>
      )}
    </PortalPage>
  );
}

/* =======================================================================
   5. EMPLOYEES
   ======================================================================= */
export function AdminEmployees() {
  const list = state.adm.employees;
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");

  useEffect(() => { adminLoadEmployees(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (Q().get("new") === "1") setEditing({ mode: "new" });
  }, []);

  const rows = list.filter(e => !q || matches(e.name + " " + e.phone, q));

  const save = values => {
    adminSaveEmployee({
      name: values.name,
      phone: values.phone,
      email: values.email,
      permissionPreset: values.preset,
      permissions: values.areas,
      isActive: true,
    }, values.id || null)
      .then(res => {
        auditLog(values.id ? "Employee updated" : "Employee created", values.name, values.areas.join(", "));
        if (res && res.tempPassword) {
          notify.result({
            icon: "success",
            title: `${values.name} can now sign in`,
            html: `Share this temporary password — it must be changed at first login:<br /><b style="font-size:1.2em;letter-spacing:.05em">${res.tempPassword}</b>`,
            confirmText: t("close") || "Close",
          });
        }
      })
      .catch(() => {})
      .finally(() => setEditing(null));
  };

  const columns = [
    {
      key: "name", label: "Employee", primary: true, render: e => (
        <span className="cell-product">
          <span className="avatar" aria-hidden="true">{String(e.name).slice(0, 2).toUpperCase()}</span>
          <span><b>{e.name}</b><small>{e.phone}</small></span>
        </span>
      ),
    },
    { key: "preset", label: "Preset", render: e => <Badge tone="info">{(ROLE_PRESETS[e.permissionPreset] || {}).label || "Custom"}</Badge> },
    { key: "areas", label: "Permissions", render: e => <span className="muted">{(e.permissions || []).length} area{(e.permissions || []).length === 1 ? "" : "s"}</span> },
    { key: "role", label: "Role", render: e => <Badge>{e.role === "admin" ? "Super Admin" : "Staff"}</Badge> },
    { key: "active", label: t("status"), render: e => <Badge tone={e.isActive ? "ok" : "bad"}>{e.isActive ? "Active" : "Deactivated"}</Badge> },
    {
      key: "lastLogin", label: "Last login",
      render: e => e.lastLoginAt ? new Date(e.lastLoginAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : <span className="muted">Never</span>,
    },
  ];

  return (
    <PortalPage title="Employees" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Employees" }]}
      action={<PageAction icon={FiPlus} onClick={() => setEditing({ mode: "new" })}>Create or invite</PageAction>}>
      <InfoNote>
        Permission presets are templates only. Tick the exact boxes each person needs — hidden areas
        simply do not appear in their dashboard.
      </InfoNote>

      <div className="portal-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search employees…" />
      </div>

      <SectionCard>
        <DataTable columns={columns} rows={rows} rowKey={e => e._id}
          empty={<EmptyState icon={FaUserTie} title="No employees yet" text="Create an account and choose a permission preset." />}
          actions={e => (
            <div className="row-btns">
              <button type="button" className="mini-btn" onClick={() => setEditing({ mode: "edit", employee: e })}><FiEdit2 /></button>
              {e.role !== "admin" && (
                <button type="button" className={`mini-btn ${e.isActive ? "danger" : ""}`} onClick={async () => {
                  if (e.isActive) {
                    const ok = await notify.confirm({
                      title: `Deactivate ${e.name}?`,
                      text: "They will be signed out and cannot sign in until you reactivate the account.",
                      confirmText: "Deactivate", cancelText: t("cancel"), danger: true,
                    });
                    if (!ok) return;
                  }
                  adminSetEmployeeActive(e._id, !e.isActive)
                    .then(() => auditLog(e.isActive ? "Employee deactivated" : "Employee activated", e.name))
                    .catch(() => {});
                }}>{e.isActive ? "Deactivate" : "Activate"}</button>
              )}
            </div>
          )} />
      </SectionCard>

      {editing && (
        <EmployeeModal
          initial={editing.employee}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </PortalPage>
  );
}

function EmployeeModal({ initial, onClose, onSave }) {
  const [f, setF] = useState(() => ({
    id: initial ? initial._id : "",
    name: initial ? initial.name : "",
    phone: initial ? initial.phone : "",
    email: initial ? initial.email || "" : "",
    preset: initial ? (initial.permissionPreset || "") : "order_handler",
    areas: initial ? [...(initial.permissions || [])] : [...ROLE_PRESETS.order_handler.areas],
  }));

  const applyPreset = preset => {
    setF(x => ({ ...x, preset, areas: [...(ROLE_PRESETS[preset] || { areas: [] }).areas] }));
  };

  const toggle = area => setF(x => ({
    ...x,
    areas: x.areas.includes(area) ? x.areas.filter(a => a !== area) : [...x.areas, area],
  }));

  const submit = e => {
    e.preventDefault();
    if (!f.name.trim()) { notify.warning("Enter the employee's name"); return; }
    if (!/^[+\d][\d\s-]{7,}$/.test(f.phone.trim())) { notify.warning("Enter a valid phone number"); return; }
    if (!f.areas.length) { notify.warning("Tick at least one permission area"); return; }
    onSave(f);
  };

  return (
    <Modal open title={initial ? `Edit ${initial.name}` : "Create employee"} onClose={onClose}
      footer={<>
        <button className="btn ghost" type="button" onClick={onClose}>{t("cancel")}</button>
        <button className="btn" type="submit" form="emp-form">{t("save")}</button>
      </>}>
      <form id="emp-form" onSubmit={submit} className="pform">
        <label className="field"><span>{t("full_name")}</span>
          <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></label>
        <div className="form-grid two">
          <label className="field"><span>{t("phone_num")}</span>
            <input type="tel" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="+250 7…" required /></label>
          <label className="field"><span>{t("email")}</span>
            <input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
        </div>

        <fieldset className="notes-fieldset">
          <legend>Permission preset</legend>
          <div className="preset-grid">
            {Object.entries(ROLE_PRESETS).map(([id, preset]) => (
              <label key={id} className={`preset ${f.preset === id ? "on" : ""}`}>
                <input type="radio" name="preset" checked={f.preset === id} onChange={() => applyPreset(id)} />
                <b>{preset.label}</b>
                <small>{preset.shows}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="notes-fieldset">
          <legend>Permissions ({f.areas.length} selected)</legend>
          <div className="perm-grid">
            {PERMISSION_AREAS.map(([id, label]) => (
              <label key={id} className="switch-row">
                <input type="checkbox" checked={f.areas.includes(id)} onChange={() => toggle(id)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

/* =======================================================================
   6. MARKETING — coupons, bundles, featured, subscribers
   ======================================================================= */
export function AdminMarketing() {
  /* Sub-tabs are real routes (#/admin/marketing/subscribers) so the sidebar
     highlight and the back button both behave. */
  const tab = (() => {
    const seg = (typeof window !== "undefined" ? window.location.hash.slice(1).split("?")[0] : "").split("/").filter(Boolean);
    return seg[2] || Q().get("tab") || "coupons";
  })();
  const [coupons, setCoupons] = useLS(KEY.coupons, state.promos || []);
  const [bundles, setBundles] = useLS(KEY.bundles, []);
  const [featured, setFeatured] = useLS(KEY.featured, PRODUCTS.filter(p => p.trending).map(p => p.id));
  const [q, setQ] = useState("");

  useEffect(() => {
    if (Q().get("new") === "1") addCoupon();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addCoupon = async () => {
    const code = await notify.askText({ title: "New coupon code", placeholder: "KIGALI10", label: "Enter a code" });
    if (code == null) return;
    const label = await notify.askText({ title: `What does ${code.toUpperCase()} give?`, placeholder: "10% off oils", label: "Describe the offer" });
    if (label == null) return;
    admPromoAdd(code, label);
    setCoupons(prev => [...prev, { code: code.toUpperCase(), label, active: true, uses: 0 }]);
    auditLog("Coupon created", code.toUpperCase(), label);
    notify.success(`Coupon ${code.toUpperCase()} created`);
  };

  const subscribers = readLS("imibavu_subscribers", []);

  return (
    <PortalPage title="Marketing" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Marketing" }]}
      action={<PageAction icon={FiPlus} onClick={addCoupon}>Create coupon</PageAction>}>
      <div className="chip-row tabs-row">
        {[["coupons", "Coupons"], ["bundles", "Bundles"], ["featured", "Featured items"], ["subscribers", "WhatsApp subscribers"]].map(([id, label]) => (
          <a key={id} className={`chip ${tab === id ? "on" : ""}`} href={"#/admin/marketing" + (id === "coupons" ? "" : "/" + id)}>{label}</a>
        ))}
      </div>

      {tab === "coupons" && (
        <SectionCard title="Coupons">
          <DataTable
            columns={[
              { key: "code", label: "Code", primary: true, render: c => <b>{c.code}</b> },
              { key: "label", label: "Offer", render: c => c.label },
              { key: "uses", label: "Times used", render: c => c.uses || 0 },
              { key: "active", label: t("status"), render: c => <Badge tone={c.active ? "ok" : "warn"}>{c.active ? "Active" : "Paused"}</Badge> },
            ]}
            rows={coupons}
            rowKey={c => c.code}
            empty={<EmptyState icon={FiPercent} title="No coupons yet" text="Create a code to run a promotion." />}
            actions={c => (
              <div className="row-btns">
                <button type="button" className="mini-btn" onClick={() => {
                  setCoupons(prev => prev.map(x => x.code === c.code ? { ...x, active: !x.active } : x));
                  const i = (state.promos || []).findIndex(p => p.code === c.code);
                  if (i >= 0) admPromo(i);
                  auditLog(c.active ? "Coupon paused" : "Coupon activated", c.code);
                  notify.success(`${c.code} ${c.active ? "paused" : "activated"}`);
                }}>{c.active ? "Pause" : "Activate"}</button>
                <button type="button" className="mini-btn danger" onClick={async () => {
                  const ok = await notify.confirm({
                    title: `Delete ${c.code}?`,
                    text: "Customers will no longer be able to use this code.",
                    confirmText: t("delete"), cancelText: t("cancel"), danger: true,
                  });
                  if (!ok) return;
                  setCoupons(prev => prev.filter(x => x.code !== c.code));
                  auditLog("Coupon deleted", c.code);
                  notify.success(`${c.code} deleted`);
                }}><FiTrash2 /></button>
              </div>
            )}
          />
        </SectionCard>
      )}

      {tab === "bundles" && (
        <SectionCard title="Bundles"
          action={<button className="mini-btn" type="button" onClick={async () => {
            const name = await notify.askText({ title: "Bundle name", placeholder: "Summer Duo", label: "Enter a name" });
            if (name == null) return;
            setBundles(prev => [...prev, { id: "b" + Date.now(), name, items: [], active: true }]);
            auditLog("Bundle created", name);
            notify.success(`Bundle "${name}" created`);
          }}><FiPlus /> New bundle</button>}>
          {bundles.length === 0
            ? <EmptyState icon={FiTag} title="No bundles yet" text="Group products into a discounted set customers can buy together." />
            : bundles.map(b => (
              <div className="alert-row" key={b.id}>
                <FiTag aria-hidden="true" />
                <div className="rank-info"><b>{b.name}</b><small className="muted">{b.items.length} product(s)</small></div>
                <Badge tone={b.active ? "ok" : "warn"}>{b.active ? "Active" : "Paused"}</Badge>
              </div>
            ))}
        </SectionCard>
      )}

      {tab === "featured" && (
        <SectionCard title="Featured items">
          <p className="muted chart-note">Tick the products that appear in the homepage “Trending fragrances” row.</p>
          <SearchBox value={q} onChange={setQ} placeholder="Find a product…" />
          <ul className="feature-list">
            {PRODUCTS.filter(p => !q || matches(p.name, q)).slice(0, 40).map(p => (
              <li key={p.id}>
                <label className="switch-row">
                  <input type="checkbox" checked={featured.includes(p.id)} onChange={() => {
                    setFeatured(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]);
                    p.trending = !featured.includes(p.id);
                    auditLog(p.trending ? "Featured" : "Unfeatured", p.name);
                  }} />
                  <ProductImage product={p} alt="" />
                  <span>{p.name} <small className="muted">{brandName(p.brand)}</small></span>
                </label>
              </li>
            ))}
          </ul>
          <button className="btn sm" type="button" onClick={() => notify.success(`${featured.length} featured products saved`)}>{t("save")}</button>
        </SectionCard>
      )}

      {tab === "subscribers" && (
        <SectionCard title="WhatsApp subscribers"
          action={<button className="mini-btn" type="button" onClick={() => {
            if (!subscribers.length) { notify.info("No subscribers to export yet"); return; }
            csvDownload("imibavu-subscribers.csv", [["Phone", "Joined"], ...subscribers.map(s => [s.phone, s.at || ""])]);
            notify.success("Subscriber list exported");
          }}>Export</button>}>
          {subscribers.length === 0
            ? <EmptyState icon={FiSmartphone} title="No subscribers yet" text="Newsletter sign-ups from the footer land here." />
            : subscribers.map((s, i) => (
              <div className="alert-row" key={i}>
                <FiSmartphone aria-hidden="true" /><div className="rank-info"><b>{s.phone}</b></div>
              </div>
            ))}
        </SectionCard>
      )}
    </PortalPage>
  );
}

/* =======================================================================
   7. BOOKINGS + QUIZ
   ======================================================================= */
export function AdminBookings() {
  const [bookings, setBookings] = useLS(KEY.bookings, []);
  const confirmed = bookings.filter(b => b.status === "confirmed");
  const pending = bookings.filter(b => b.status !== "confirmed" && b.status !== "cancelled");

  const decide = async (b, status) => {
    if (status === "cancelled") {
      const reason = await notify.askReason({ title: `Cancel ${b.name}'s session?`, confirmText: "Cancel session" });
      if (reason == null) return;
      auditLog("Booking cancelled", b.name, reason);
    } else if (status === "rescheduled") {
      const when = await notify.askText({ title: "New date and time", placeholder: "2026-02-14 15:30", label: "Enter the new slot" });
      if (when == null) return;
      setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status, date: when } : x));
      auditLog("Booking rescheduled", b.name, when);
      notify.success(`${b.name} moved to ${when}`);
      return;
    } else {
      auditLog("Booking confirmed", b.name);
    }
    setBookings(prev => prev.map(x => x.id === b.id ? { ...x, status } : x));
    notify.success(`${b.name} — ${status}`);
  };

  return (
    <PortalPage title="Bookings and blends" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: t("bookings") }]}>
      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-label">Pending</span><b className="kpi-value">{pending.length}</b></div>
        <div className="kpi"><span className="kpi-label">Confirmed</span><b className="kpi-value">{confirmed.length}</b></div>
        <div className="kpi"><span className="kpi-label">Slots today</span><b className="kpi-value">4 / 8</b></div>
      </div>

      <SectionCard title="Sessions needing confirmation">
        {bookings.length === 0
          ? <EmptyState icon={FiCalendar} title="No sessions booked" text="Blending session requests from the storefront appear here for confirmation." />
          : bookings.map(b => (
            <div className="alert-row" key={b.id}>
              <FiCalendar aria-hidden="true" className={b.status === "confirmed" ? "" : "warn"} />
              <div className="rank-info">
                <b>{b.name} — {b.date} {b.time}</b>
                <small className="muted">{b.phone} · {b.msg || "no notes"}</small>
              </div>
              <Badge tone={b.status === "confirmed" ? "ok" : b.status === "cancelled" ? "bad" : "warn"}>{b.status || "pending"}</Badge>
              {b.status !== "confirmed" && <button className="mini-btn" type="button" onClick={() => decide(b, "confirmed")}>Confirm</button>}
              <button className="mini-btn" type="button" onClick={() => decide(b, "rescheduled")}>Reschedule</button>
              <button className="mini-btn danger" type="button" onClick={() => decide(b, "cancelled")}>Cancel</button>
            </div>
          ))}
      </SectionCard>

      <SectionCard title="Slot capacity">
        <p className="muted chart-note">Blending sessions run in 90-minute slots. Capacity is per slot.</p>
        <div className="slot-grid">
          {["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"].map(s => (
            <div className="slot" key={s}>
              <b>{s}</b>
              <span className="muted">{s === "12:00" || s === "15:00" ? "Full" : "2 of 4 free"}</span>
              <button type="button" className="mini-btn" onClick={() => notify.info(`Capacity for ${s} opened for booking`)}>Edit</button>
            </div>
          ))}
        </div>
      </SectionCard>
    </PortalPage>
  );
}

export function AdminQuiz() {
  const [cfg, setCfg] = useLS(KEY.quiz, {
    moods: ["Fresh & light", "Sweet & warm", "Oud & woody", "Musky & soft"],
    seasons: ["Hot daytime", "Office & everyday", "Evening", "Cooler months"],
    notes: ["Rose", "Oud", "Vanilla", "Citrus", "Amber", "Musk", "Saffron", "Sandalwood"],
  });
  const [draft, setDraft] = useState({});
  const [which, setWhich] = useState("moods");

  return (
    <PortalPage title="Scent Finder quiz" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Scent Finder" }]}>
      <InfoNote>
        The three questions customers answer: mood, season and scent notes. Editing an option does not
        change past results.
      </InfoNote>
      <div className="chip-row tabs-row">
        {[["moods", "Mood"], ["seasons", "Season"], ["notes", "Notes"]].map(([id, label]) => (
          <button key={id} type="button" className={`chip ${which === id ? "on" : ""}`}
            aria-pressed={which === id} onClick={() => setWhich(id)}>{label}</button>
        ))}
      </div>
      <SectionCard title={`${which[0].toUpperCase() + which.slice(1)} options`}>
        <ul className="feature-list">
          {cfg[which].map((opt, i) => (
            <li key={i}>
              <input className="inline-input wide" value={draft[which + i] ?? opt} aria-label={`Option ${i + 1}`}
                onChange={e => setDraft(d => ({ ...d, [which + i]: e.target.value }))} />
              <button type="button" className="mini-btn danger" onClick={() => {
                setCfg(c => ({ ...c, [which]: c[which].filter((_, x) => x !== i) }));
                notify.success("Option removed");
              }}><FiTrash2 /></button>
            </li>
          ))}
        </ul>
        <div className="row-btns">
          <button className="btn ghost sm" type="button" onClick={() => {
            const value = (draft[which + "new"] || "").trim();
            if (!value) { notify.warning("Type the option first"); return; }
            setCfg(c => ({ ...c, [which]: [...c[which], value] }));
            setDraft(d => ({ ...d, [which + "new"]: "" }));
            notify.success("Option added");
          }}><FiPlus /> Add option</button>
          <input className="inline-input wide" placeholder="New option" aria-label="New option"
            value={draft[which + "new"] || ""} onChange={e => setDraft(d => ({ ...d, [which + "new"]: e.target.value }))} />
          <button className="btn sm" type="button" onClick={() => {
            const next = { ...cfg };
            Object.keys(draft).forEach(k => {
              if (k.startsWith(which) && !k.endsWith("new")) {
                const idx = Number(k.slice(which.length));
                if (!isNaN(idx) && next[which][idx] != null) next[which][idx] = draft[k];
              }
            });
            setCfg(next);
            auditLog("Quiz updated", which, `${next[which].length} options`);
            notify.success("Quiz saved");
          }}>{t("save")}</button>
        </div>
      </SectionCard>
    </PortalPage>
  );
}

/* =======================================================================
   8. BRANDS
   ======================================================================= */
export function AdminBrands() {
  const [story, setStory] = useLS("imibavu_brand_story", {});
  return (
    <PortalPage title="Brands and collections" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Brands" }]}>
      <div className="portal-grid two">
        {BRANDS.map(b => (
          <SectionCard key={b.id} title={b.name} action={<Badge tone="info">{PRODUCTS.filter(p => p.brand === b.id).length} products</Badge>}>
            <div className="brand-edit">
              <span className="b-mark" aria-hidden="true">{b.name.slice(0, 1)}</span>
              <div>
                <label className="field"><span>Tagline</span>
                  <input className="inline-input wide" value={story[b.id] || b.tag}
                    onChange={e => setStory(prev => ({ ...prev, [b.id]: e.target.value }))} /></label>
              </div>
            </div>
            <label className="field"><span>Story</span>
              <textarea rows={3} placeholder="How this house started, what it is known for…"
                value={story[b.id + "_story"] || ""}
                onChange={e => setStory(prev => ({ ...prev, [b.id + "_story"]: e.target.value }))} /></label>
            <div className="row-btns">
              <button className="btn ghost sm" type="button" onClick={() => notify.info("Banner upload opens on the product editor's image step")}>
                <FiImage /> Banner
              </button>
              <button className="btn sm" type="button" onClick={() => { auditLog("Brand saved", b.name); notify.success(`${b.name} saved`); }}>
                {t("save")}
              </button>
            </div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Collections">
        <ul className="feature-list">
          {COLLECTIONS.map(c => (
            <li key={c.id}>
              <span className="pill info">{c.id}</span>
              <span>{c.label || c.title || c.id}</span>
              <span className="muted">{PRODUCTS.filter(c.match).length} products</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </PortalPage>
  );
}

/* =======================================================================
   9. REVIEWS
   ======================================================================= */
export function AdminReviews() {
  const reviews = state.adm.reviews || [];
  useEffect(() => { loadAdminData(); }, []);
  return (
    <PortalPage title="Reviews" crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: "Reviews" }]}>
      <SectionCard>
        {!state.adm.reviewsLoaded
          ? <EmptyState icon={FiStar} title={t("loading")} text="Fetching reviews from the API…" />
          : reviews.length === 0
            ? <EmptyState icon={FiStar} title="No reviews yet" text="Customer reviews land here for moderation." />
            : reviews.map(r => (
              <div className="alert-row" key={r._id}>
                <span className="avatar" aria-hidden="true">{String(r.name || "?").slice(0, 2).toUpperCase()}</span>
                <div className="rank-info">
                  <b>{(prod(r.slug) || {}).name || r.slug} — {r.name}</b>
                  <small className="muted">{"★".repeat(Number(r.stars) || 0)} {r.text}</small>
                </div>
                <Badge tone={r.status === "hidden" ? "bad" : r.status === "pending" ? "warn" : "ok"}>{r.status || "pending"}</Badge>
                <button className="mini-btn" type="button" onClick={() => {
                  admRev2(r._id);
                  auditLog("Review moderated", r.name, r.status === "hidden" ? "approved" : "hidden");
                  notify.success("Review updated");
                }}>{r.status === "hidden" ? "Approve" : "Hide"}</button>
              </div>
            ))}
      </SectionCard>
    </PortalPage>
  );
}

/* =======================================================================
   10. REPORTS
   ======================================================================= */
export function AdminReports() {
  const [period, setPeriod] = useState(30);
  const orders = (state.adm.orders && state.adm.orders.length) ? state.adm.orders : state.orders;
  const window = orders.filter(o => Date.now() - orderTime(o) < period * DAY);

  const revenue = window.reduce((n, o) => n + Number(o.total || 0), 0);
  const byCategory = CATEGORIES.map(c => ({
    name: c.label,
    value: window.reduce((n, o) => n + (o.items || []).reduce((m, it) => {
      const p = PRODUCTS.find(x => x.name === it.name);
      return m + (p && p.category === c.id ? Number(it.price || 0) * Number(it.qty || 1) : 0);
    }, 0), 0),
  }));
  const byProduct = (() => {
    const map = new Map();
    window.forEach(o => (o.items || []).forEach(it => {
      const k = it.name || it.slug;
      const prev = map.get(k) || { name: k, qty: 0, revenue: 0 };
      prev.qty += Number(it.qty || 1);
      prev.revenue += Number(it.price || 0) * Number(it.qty || 1);
      map.set(k, prev);
    }));
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  })();

  const stockValue = PRODUCTS.reduce((n, p) => n + (stockOf(p) === "out" ? 0 : p.price), 0);

  return (
    <PortalPage title={t("reports")} crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: t("reports") }]}
      action={<ExportButton onExport={kind => {
        if (kind === "csv") {
          csvDownload("imibavu-report.csv", [
            ["Metric", "Value"],
            ["Period (days)", period],
            ["Revenue", revenue],
            ["Orders", window.length],
            ["Average order value", window.length ? Math.round(revenue / window.length) : 0],
            ["Stock valuation", stockValue],
            [], ["Product", "Qty", "Revenue"],
            ...byProduct.map(p => [p.name, p.qty, p.revenue]),
          ]);
          notify.success("Report exported");
        } else notify.info("Charts print from the browser: Ctrl/Cmd + P.");
      }} />}>
      <div className="chip-row">
        {[[7, t("last_7")], [30, t("last_30")], [90, "90 days"], [365, "This year"]].map(([d, label]) => (
          <button key={d} type="button" className={`chip ${period === d ? "on" : ""}`}
            aria-pressed={period === d} onClick={() => setPeriod(d)}>{label}</button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi"><span className="kpi-label">Revenue</span><b className="kpi-value">{money(revenue)}</b></div>
        <div className="kpi"><span className="kpi-label">Orders</span><b className="kpi-value">{window.length}</b></div>
        <div className="kpi"><span className="kpi-label">Average order</span><b className="kpi-value">{money(window.length ? Math.round(revenue / window.length) : 0)}</b></div>
        <div className="kpi"><span className="kpi-label">Stock valuation</span><b className="kpi-value">{money(stockValue)}</b></div>
      </div>

      <SectionCard title="Sales by category">
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byCategory} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={46}
                tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip formatter={v => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid var(--line)", background: "var(--white)", fontSize: 13 }} />
              <Bar dataKey="value" fill="var(--gold)" radius={[6, 6, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="portal-grid two">
        <SectionCard title="Best-selling products">
          {byProduct.length === 0
            ? <EmptyState compact icon={FiPackage} title="No sales in this period" text="Try a longer period." />
            : (
              <DataTable
                columns={[
                  { key: "name", label: "Product", primary: true },
                  { key: "qty", label: "Units sold" },
                  { key: "revenue", label: "Revenue", render: p => money(p.revenue) },
                ]}
                rows={byProduct} rowKey={p => p.name} />
            )}
        </SectionCard>

        <SectionCard title="Coupon usage">
          {(state.promos || []).length === 0
            ? <EmptyState compact icon={FiPercent} title="No coupons" text="Create coupons under Marketing." />
            : (state.promos || []).map(p => (
              <div className="alert-row" key={p.code}>
                <FiPercent aria-hidden="true" />
                <div className="rank-info"><b>{p.code}</b><small className="muted">{p.label}</small></div>
                <Badge tone={p.active ? "ok" : "warn"}>{p.active ? "Active" : "Paused"}</Badge>
              </div>
            ))}
        </SectionCard>
      </div>

      <SectionCard title="Sales by employee">
        <p className="muted chart-note">Assign orders to an employee from the Orders page to build this report.</p>
        <DataTable
          columns={[
            { key: "name", label: "Employee", primary: true },
            { key: "orders", label: "Orders handled" },
            { key: "revenue", label: "Revenue", render: e => money(e.revenue) },
          ]}
          rows={(() => {
            const assign = readLS("imibavu_assign", {});
            const map = new Map();
            Object.entries(assign).forEach(([code, name]) => {
              const o = orders.find(x => x.code === code);
              if (!o || !name) return;
              const prev = map.get(name) || { name, orders: 0, revenue: 0 };
              prev.orders += 1;
              prev.revenue += Number(o.total || 0);
              map.set(name, prev);
            });
            return [...map.values()];
          })()}
          rowKey={e => e.name}
          empty={<EmptyState compact icon={FaUserTie} title="No assignments yet" text="Assign orders to track performance per employee." />}
        />
      </SectionCard>
    </PortalPage>
  );
}

/* =======================================================================
   11. SETTINGS
   ======================================================================= */
export function AdminSettings() {
  const [s, setS] = useLS(KEY.settings, {
    name: STORE.name, phone: STORE.phone, address: STORE.address,
    currency: "RWF", freeDelivery: 60000, maintenance: false,
    templates: { order: "Your Imibavu order {{code}} is confirmed.", shipped: "Order {{code}} is on the way." },
    payments: { momo: true, card: true, cash: true },
  });
  const [mfaCode, setMfaCode] = useState("");
  const theme = getTheme();

  const set = (k, v) => setS(prev => ({ ...prev, [k]: v }));

  return (
    <PortalPage title={t("settings")} crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: t("settings") }]}
      action={<PageAction icon={FiCheck} onClick={() => { auditLog("Settings saved", "store"); notify.success("Settings saved"); }}>{t("save")}</PageAction>}>
      <div className="portal-grid two">
        <SectionCard title="Store details">
          <label className="field"><span>Store name</span><input value={s.name} onChange={e => set("name", e.target.value)} /></label>
          <label className="field"><span>{t("phone_num")}</span><input value={s.phone} onChange={e => set("phone", e.target.value)} /></label>
          <label className="field"><span>Address</span><input value={s.address} onChange={e => set("address", e.target.value)} /></label>
          <label className="field"><span>Currency</span>
            <select value={s.currency} onChange={e => set("currency", e.target.value)}>
              <option value="RWF">RWF — Rwandan franc</option>
            </select></label>
          <label className="field"><span>Free delivery over (RWF)</span>
            <input type="number" inputMode="numeric" value={s.freeDelivery} onChange={e => set("freeDelivery", e.target.value)} /></label>
        </SectionCard>

        <SectionCard title="Delivery zones and fees">
          <DataTable
            columns={[
              { key: "label", label: "Zone", primary: true },
              { key: "fee", label: "Fee", render: z => (z.fee ? money(z.fee) : "Free") },
            ]}
            rows={ZONES} rowKey={z => z.id} />
          <InfoNote>Zone fees also apply at checkout and on new orders.</InfoNote>
        </SectionCard>
      </div>

      <div className="portal-grid two">
        <SectionCard title="Payment methods">
          {Object.entries(s.payments).map(([id, on]) => (
            <label className="switch-row" key={id}>
              <input type="checkbox" checked={on} onChange={e => setS(prev => ({ ...prev, payments: { ...prev.payments, [id]: e.target.checked } }))} />
              <span>{id === "momo" ? "Mobile Money (MTN / Airtel)" : id === "card" ? "Card (Flutterwave)" : "Cash on delivery"}</span>
            </label>
          ))}
        </SectionCard>

        <SectionCard title="Notification templates">
          <label className="field"><span>Order confirmed (SMS / WhatsApp)</span>
            <textarea rows={2} value={s.templates.order} onChange={e => set("templates", { ...s.templates, order: e.target.value })} /></label>
          <label className="field"><span>Out for delivery</span>
            <textarea rows={2} value={s.templates.shipped} onChange={e => set("templates", { ...s.templates, shipped: e.target.value })} /></label>
          <p className="form-note">Use these as placeholders: <code>{"{{code}}"}</code> and <code>{"{{total}}"}</code>.</p>
        </SectionCard>
      </div>

      <div className="portal-grid two">
        <SectionCard title="Appearance">
          <div className="row-btns">
            <button type="button" className={`btn ghost sm ${theme === "light" ? "on" : ""}`} onClick={() => { setTheme("light"); notify.info(t("light_mode")); }}>
              <FiSun /> {t("light_mode")}
            </button>
            <button type="button" className={`btn ghost sm ${theme === "dark" ? "on" : ""}`} onClick={() => { setTheme("dark"); notify.info(t("dark_mode")); }}>
              <FiMoon /> {t("dark_mode")}
            </button>
            <button type="button" className="btn ghost sm" onClick={() => { clearTheme(); notify.success("Back to the device setting"); }}>
              <FiRefreshCw /> Follow device
            </button>
          </div>
          <label className="field" style={{ marginTop: 12 }}><span>{t("language")}</span>
            <select value={state.lang} onChange={e => setLang(e.target.value)}>
              <option value="en">English</option><option value="rw">Kinyarwanda</option><option value="fr">Français</option>
            </select></label>
        </SectionCard>

        <SectionCard title="Security">
          <label className="switch-row">
            <input type="checkbox" checked={s.maintenance} onChange={e => {
              set("maintenance", e.target.checked);
              auditLog(e.target.checked ? "Maintenance mode on" : "Maintenance mode off", "store");
              notify.warning(e.target.checked ? "Maintenance mode is on — the shop shows a notice" : "Maintenance mode off");
            }} />
            <span>Maintenance mode (shop shows a notice, admin stays open)</span>
          </label>

          <div className="mfa-block">
            <h4>Two-step verification</h4>
            {state.user && state.user.mfaEnabled
              ? (
                <>
                  <p className="pill ok"><FiCheck /> {t("in_stock") === "" ? "" : "Enabled"}</p>
                  <label className="field"><span>Enter a code to turn it off</span>
                    <input inputMode="numeric" value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="123456" /></label>
                  <button className="btn ghost sm" type="button" onClick={async () => {
                    if (mfaCode.length < 6) { notify.warning("Enter the 6-digit code"); return; }
                    try {
                      await disableMfa(mfaCode);
                      auditLog("MFA disabled", (state.user || {}).name);
                    } catch (err) { notify.apiError(err); }
                  }}>Turn off MFA</button>
                </>
              )
              : <p className="muted">MFA is not enabled on this account. Super Admin and employee accounts are asked to set it up at first sign-in.</p>}
          </div>
        </SectionCard>
      </div>
    </PortalPage>
  );
}

/* =======================================================================
   12. AUDIT LOG
   ======================================================================= */
export function AdminAudit() {
  const rows = useAudit();
  const [q, setQ] = useState("");
  const filtered = rows.filter(r => !q || matches(`${r.actor} ${r.action} ${r.entity} ${r.detail}`, q));

  return (
    <PortalPage title={t("audit_log")} crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: t("audit_log") }]}
      action={<ExportButton onExport={kind => {
        if (kind === "csv") {
          csvDownload("imibavu-audit.csv", [["When", "Who", "Role", "Action", "Entity", "Detail"],
            ...filtered.map(r => [new Date(r.at).toISOString(), r.actor, r.role, r.action, r.entity, r.detail])]);
          notify.success("Audit log exported");
        } else notify.info("Print with Ctrl/Cmd + P.");
      }} />}>
      <div className="portal-toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search who changed what…" />
      </div>
      <SectionCard>
        {filtered.length === 0
          ? <EmptyState icon={FiLock} title="No entries yet" text="Every change made in the portal is recorded here with who and when." />
          : (
            <DataTable
              columns={[
                { key: "at", label: "When", primary: true, render: r => new Date(r.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) },
                { key: "actor", label: "Who", render: r => (<>{r.actor}<br /><small className="muted">{r.role}</small></>) },
                { key: "action", label: "Action" },
                { key: "entity", label: "Entity" },
                { key: "detail", label: "Detail", render: r => r.detail || "—" },
              ]}
              rows={filtered} rowKey={r => r.id} />
          )}
      </SectionCard>
    </PortalPage>
  );
}

/* =======================================================================
   13. PROFILE
   ======================================================================= */
export function AdminProfile() {
  const u = state.user || {};
  const [sessions, setSessions] = useState([
    { id: 1, device: "This browser", where: "Kigali, RW", current: true, at: Date.now() },
  ]);
  useEffect(() => { loadLoyalty(); }, []);

  return (
    <PortalPage title={t("profile")} crumbs={[{ label: t("dashboard"), href: "#/admin" }, { label: t("profile") }]}>
      <div className="portal-grid two">
        <SectionCard title="My details">
          <label className="field"><span>{t("full_name")}</span><input defaultValue={u.name || ""} /></label>
          <label className="field"><span>{t("phone_num")}</span><input defaultValue={u.phone || ""} /></label>
          <label className="field"><span>{t("email")}</span><input defaultValue={u.email || ""} /></label>
          <button className="btn sm" type="button" onClick={() => { auditLog("Profile updated", u.name || "me"); notify.success("Profile saved"); }}>
            {t("save")}
          </button>
        </SectionCard>

        <SectionCard title="Active sessions"
          action={<button className="mini-btn danger" type="button" onClick={async () => {
            const ok = await notify.confirm({
              title: "Log out all other devices?",
              text: "Any other phone or computer signed into this account will be signed out.",
              confirmText: "Log out everywhere", cancelText: t("cancel"), danger: true,
            });
            if (!ok) return;
            setSessions(s => s.filter(x => x.current));
            auditLog("Sessions revoked", u.name || "me");
            notify.success("All other sessions were ended");
          }}>Log out all devices</button>}>
          <ul className="activity-list">
            {sessions.map(s => (
              <li key={s.id}>
                <span className="avatar" aria-hidden="true"><FiSmartphone /></span>
                <div>
                  <b>{s.device}{s.current ? " (current)" : ""}</b>
                  <small className="muted">{s.where} · {new Date(s.at).toLocaleString("en-GB")}</small>
                </div>
                {!s.current && <button className="mini-btn danger" type="button" onClick={() => setSessions(x => x.filter(y => y.id !== s.id))}>End</button>}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Permissions on this account">
        <p className="muted chart-note">
          {u.role === "admin"
            ? "Super Admin — full access to every area."
            : "Employee account — only the areas ticked by the Super Admin appear in your sidebar."}
        </p>
        <div className="perm-grid">
          {PERMISSION_AREAS.map(([id, label]) => (
            <span key={id} className={`pill ${canAccess(id) ? "ok" : ""}`}>
              {canAccess(id) ? <FiCheck aria-hidden="true" /> : <FiLock aria-hidden="true" />} {label}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Account">
        <div className="row-btns">
          <a className="btn ghost sm" href="#/account/security"><FiLock /> {t("security_privacy")}</a>
          <button className="btn ghost sm danger" type="button" onClick={async () => {
            const ok = await notify.confirm({
              title: "Log out of Imibavu?", text: "You will need to sign in again.",
              confirmText: t("logout"), cancelText: t("cancel"), danger: true,
            });
            if (ok) { logout(); go("#/login"); }
          }}>Log out</button>
        </div>
      </SectionCard>
    </PortalPage>
  );
}
