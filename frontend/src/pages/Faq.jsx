import { useState } from "react";
import { useStore, state } from "../store";
import { t } from "../i18n";
import { FAQS, STORE } from "../data";
import { waLink } from "../utils";
import { FaWhatsapp } from "../components/Icons";

export default function Faq() {
  useStore();
  const [open, setOpen] = useState({});
  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Help</span><h1>{t("faq_title")}</h1>
        <p>Delivery, returns, longevity, authenticity and custom blends — everything customers ask us.</p>
      </div></section>
      <div className="page-body"><div className="container" style={{ maxWidth: 840 }}>
        {FAQS.map((f, i) => (
          <div className={`faq-item ${open[i] ? "open" : ""}`} key={i}>
            <button className="faq-q" onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}>{f.q}<i>+</i></button>
            <div className="faq-a" style={open[i] ? { maxHeight: 400 } : undefined}><p>{f.a}</p></div>
          </div>
        ))}
        <div className="card-box center" style={{ marginTop: 26 }}>
          <h3>Still have a question?</h3>
          <p className="muted">We answer on WhatsApp within minutes during opening hours.</p>
          <a className="btn wa-btn" target="_blank" rel="noopener noreferrer" href={waLink("Hello Imibavu Collection, I have a question:")}>
            <FaWhatsapp /> {t("whatsapp")} {STORE.phonePretty}
          </a>
        </div>
      </div></div>
    </>
  );
}