import { useStore, state } from "../store";
import { t } from "../i18n";
import { TESTIMONIALS } from "../data";
import { realImg } from "../utils";
import SectionHead from "../components/SectionHead";
import Stars from "../components/Stars";

const PHOTOS = ["The storefront", "Blending bar", "Shelf of Lattafa & Mousuf", "Jewelry corner", "Gift wrapping", "Fitting the look"];

export default function About() {
  useStore();
  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Our story</span><h1>{t("about_title")}</h1>
        <p>Minimalist perfumes, honest advice and a blending bar in the middle of downtown Kigali.</p>
      </div></section>
      <div className="page-body"><div className="container">
        <div className="prose">
          <p>Imibavu Collection started with a simple idea: fragrance should not be complicated or overpriced. We open a box, we let you smell, we tell you the truth about how long it lasts — and if nothing fits, we blend one for you.</p>
          <h3>What we carry</h3>
          <p>Trending Arabic houses such as <b>Lattafa</b> and <b>Mousuf</b>, designer-inspired alternatives, long-lasting summer perfumes built for Kigali heat, concentrated roll-on oils, and a small line of minimalist jewelry chosen to complete a look.</p>
          <h3>Custom blending</h3>
          <p>Our blending bar lets you build your own fragrance: pick a base oil, choose two or three notes, select a size. We mix it on the spot, label it with your name and save the formula so you can reorder it any time. It is the service people talk about most.</p>
          <h3>Why minimal</h3>
          <p>No walls of 300 bottles, no pressure. A tight selection we actually believe in, honest guidance on longevity and projection, and prices in RWF with Mobile Money, cash or card.</p>
        </div>

        <div className="trust-grid" style={{ marginTop: 34 }}>
          {[
            [t("trust1"), "Factory-sealed, sourced from authorised distributors"],
            [t("trust2"), "Order before 3pm for same-day delivery"],
            [t("trust3"), "30-minute sessions, free of charge"],
            [t("trust4"), "MTN MoMo, Airtel Money, cash, card"],
          ].map(([a, b], i) => (
            <div className="trust-item" key={i}>
              <div className="t-ico">{["✓", "✓", "✓", "✓"][i]}</div><b>{a}</b><span>{b}</span>
            </div>
          ))}
        </div>

        <section className="section">
          <SectionHead title={t("reviews_title")} />
          <div className="testi-scroll">
            {TESTIMONIALS.map(r => (
              <div className="testi" key={r.name}>
                <div className="review-head"><div className="avatar">{r.img}</div><div><b>{r.name}</b><Stars r={r.stars} /></div></div>
                <p>“{r.text}”</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <SectionHead title="Find us" sub={t("hero_kicker")} href="#/visit" moreKey="see_all" />
          <div className="store-photos">
            {PHOTOS.map((x, i) => (
              <div key={x} className="store-photo"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.55)), url(${realImg("about-" + i, 800, 600)})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                {x}
              </div>
            ))}
          </div>
        </section>
      </div></div>
    </>
  );
}