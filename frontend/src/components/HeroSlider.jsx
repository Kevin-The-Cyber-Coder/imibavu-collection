/* Imibavu Collection — hero slider.
   A full-bleed image carousel with one message per slide: the shop, the
   perfumes, the custom blends, gifting and the WhatsApp ordering line.

   Behaviour: auto-advances every 6.5s, pauses on hover/focus and while the tab
   is hidden, swipe on touch, arrows and dots, arrow keys, and it goes static
   when the device asks for reduced motion. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "../i18n";
import { PRODUCTS } from "../data";
import { realImg, waLink } from "../utils";
import { FaWhatsapp, FiChevronLeft, FiChevronRight } from "../components/Icons";

const AUTOPLAY_MS = 6500;

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const touch = useRef({ x: 0, y: 0, active: false });
  const count = useRef(0);

  const slides = useMemo(() => {
    /* Real products drive the photography so the hero always matches the catalog. */
    const pick = i => PRODUCTS[i] || PRODUCTS[0] || { id: "imibavu", name: "Imibavu", color: "#6b4f2f" };
    const a = pick(0);
    const b = pick(2) || a;
    const c = pick(1) || a;

    return [
      {
        id: "shop",
        seed: "imibavu-shirt",
        badge: [t("hero_badge_shop"), t("hero_badge_sameday")],
        title: <>{t("hero_s1_title")}</>,
        text: t("hero_s1_text"),
        cta: { label: t("hero_cta"), href: "#/shop" },
        cta2: { label: t("hero_s1_cta2"), href: "#/brands" },
      },
      {
        id: "perfumes",
        seed: a.id + "-hero",
        badge: [t("hero_badge_trending"), t("hero_badge_kigali")],
        title: <>{t("hero_s2_title")} <em>{a.name}</em></>,
        text: t("hero_s2_text"),
        cta: { label: `${t("nav_shop")} — ${t("cat_perfumes")}`, href: "#/shop?cat=perfumes" },
        cta2: { label: t("hero_cta2"), wa: true },
      },
      {
        id: "blends",
        seed: "blend-hero-mix",
        badge: [t("hero_badge_mixed"), t("hero_badge_custom")],
        title: <>{t("hero_s3_title")} <em>{t("hero_s3_em")}</em></>,
        text: t("hero_s3_text"),
        cta: { label: t("blend_builder"), href: "#/blends", gold: true },
        cta2: { label: t("quiz_title"), href: "#/quiz" },
      },
      {
        id: "collections",
        seed: b.id + "-hero",
        badge: [t("hero_badge_collections"), t("hero_badge_oils")],
        title: <>{t("hero_s4_title")}</>,
        text: t("hero_s4_text"),
        cta: { label: t("gift_title"), href: "#/shop?col=gifts" },
        cta2: { label: `${t("nav_shop")} — ${t("cat_jewelry")}`, href: "#/shop?cat=jewelry" },
      },
      {
        id: "order",
        seed: c.id + "-hero",
        badge: [t("hero_badge_pay"), t("hero_badge_pickup")],
        title: <>{t("hero_s5_title")}</>,
        text: t("hero_s5_text"),
        cta: { label: t("hero_cta2"), wa: true },
        cta2: { label: t("nav_visit"), href: "#/visit" },
      },
    ];
  }, []);

  count.current = slides.length;

  const go = useCallback(next => {
    const n = slides.length;
    setIndex(((next % n) + n) % n);
  }, [slides.length]);

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  /* Honour the reduce-motion device setting: no autoplay, no zoom. */
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else if (mq.removeListener) mq.removeListener(apply);
    };
  }, []);

  /* Do not animate in a background tab. */
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (paused || hidden || reduced) return;
    const id = setTimeout(() => setIndex(i => (i + 1) % count.current), AUTOPLAY_MS);
    return () => clearTimeout(id);
  }, [index, paused, hidden, reduced]);

  /* Arrow keys work once the slider has focus. */
  const onKeyDown = e => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  };

  /* Swipe: horizontal drags move a slide, vertical drags stay as scroll. */
  const onTouchStart = e => {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY, active: true };
  };
  const onTouchEnd = e => {
    if (!touch.current.active) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - touch.current.x;
    const dy = p.clientY - touch.current.y;
    touch.current.active = false;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? next : prev)();
  };

  return (
    <section
      className={`hero-slider ${paused ? "paused" : ""}`}
      aria-roledescription="carousel"
      aria-label={t("hero_slider_label")}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="hero-track" style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}>
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              className={`hero-slide ${active ? "is-active" : ""}`}
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${slides.length}`}
              aria-hidden={!active}
            >
              <div className="hero-slide-img" style={{ backgroundImage: `url(${realImg(s.seed, 1600, 1000)})` }} />
              <div className="container hero-slide-inner">
                <span className="kicker">{t("hero_kicker")}</span>
                {s.badge && (
                  <div className="hero-badges">
                    {s.badge.map(x => <span key={x}>{x}</span>)}
                  </div>
                )}
                <h1>{s.title}</h1>
                <p>{s.text}</p>
                <div className="hero-cta">
                  {s.cta.wa
                    ? (
                      <a className="btn wa-btn" target="_blank" rel="noopener noreferrer"
                        href={waLink(t("hero_wa_msg"))} tabIndex={active ? 0 : -1}>
                        <FaWhatsapp /> {s.cta.label}
                      </a>
                    )
                    : (
                      <a className={`btn ${s.cta.gold ? "gold" : ""}`} href={s.cta.href} tabIndex={active ? 0 : -1}>
                        {s.cta.label}
                      </a>
                    )}
                  {s.cta2 && (s.cta2.wa
                    ? (
                      <a className="btn wa-btn" target="_blank" rel="noopener noreferrer"
                        href={waLink(t("hero_wa_msg"))} tabIndex={active ? 0 : -1}>
                        <FaWhatsapp /> {s.cta2.label}
                      </a>
                    )
                    : (
                      <a className="btn" href={s.cta2.href} tabIndex={active ? 0 : -1}>{s.cta2.label}</a>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="hero-arrow prev" onClick={prev} aria-label={t("hero_prev")}>
        <FiChevronLeft />
      </button>
      <button type="button" className="hero-arrow next" onClick={next} aria-label={t("hero_next")}>
        <FiChevronRight />
      </button>

      <div className="hero-dots" role="tablist" aria-label={t("hero_slider_label")}>
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${t("hero_go_to")} ${i + 1}: ${typeof s.title === "string" ? s.title : s.id}`}
            className={`hero-dot ${i === index ? "on" : ""}`}
            onClick={() => go(i)}
          >
            <i />
          </button>
        ))}
      </div>

      <div className="hero-slide-thumbs" aria-hidden="true">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            className={`hero-thumb ${i === index ? "on" : ""}`}
            style={{ backgroundImage: `url(${realImg(s.seed, 160, 160)})` }}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}
