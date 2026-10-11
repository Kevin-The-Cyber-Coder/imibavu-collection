import { useStore, state } from "../store";
import { t } from "../i18n";
import { STORE, ZONES } from "../data";
import { money, waLink, realImg } from "../utils";
import { FaWhatsapp, FiMapPin, FiPhone } from "../components/Icons";

export default function Visit() {
  useStore();
  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Kigali · Rwanda</span><h1>{t("visit_title")}</h1>
        <p>{STORE.address}</p>
      </div></section>
      <div className="page-body"><div className="container visit-grid">
        <div>
          <div className="map-box">
            <iframe title="Map to Imibavu Collection" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={"https://www.google.com/maps?q=" + STORE.mapQuery + "&output=embed"} />
          </div>
          <div className="contact-actions">
            <a className="btn" href={"tel:+" + STORE.phone}><FiPhone /> {t("call")} {STORE.phonePretty}</a>
            <a className="btn wa-btn" target="_blank" rel="noopener noreferrer" href={waLink("Hello Imibavu Collection, are you open right now?")}><FaWhatsapp /> {t("whatsapp")}</a>
            <a className="btn ghost" target="_blank" rel="noopener noreferrer" href={"https://www.google.com/maps/search/?api=1&query=" + STORE.mapQuery}><FiMapPin /> {t("directions_btn")}</a>
          </div>

          <div className="card-box" style={{ marginTop: 20 }}>
            <h3>{t("directions")}</h3>
            {STORE.landmarks.map((l, i) => <div className="landmark" key={l}><b>0{i + 1}</b><span>{l}</span></div>)}
          </div>

          <div className="store-photos">
            {["Entrance — T2000 ground floor", "Inside the store", "Blending station"].map((x, i) => (
              <div key={x} className="store-photo"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.55)), url(${realImg("visit-" + i, 800, 600)})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                {x}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="card-box" style={{ marginTop: "0!important" }}>
            <h3>{t("hours")}</h3>
            <table className="hours-list">
              <tbody>
                {STORE.hours.map(([d, h]) => <tr key={d}><td>{d}</td><td>{h}</td></tr>)}
              </tbody>
            </table>
            <p className="form-note" style={{ marginTop: 12 }}>Holiday hours are announced on our WhatsApp broadcast and social pages.</p>
          </div>

          <div className="card-box" style={{ marginTop: 16 }}>
            <h3>{t("contact_details")}</h3>
            <p style={{ marginTop: 10 }}>{STORE.address}</p>
            <p><a href={"tel:+" + STORE.phone}>{STORE.phonePretty}</a><br />
              <a href={waLink("Hello Imibavu Collection!")} target="_blank" rel="noopener noreferrer">WhatsApp chat</a></p>
            <div className="f-social" style={{ marginTop: 6 }}>
              <a href={STORE.socials.instagram} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>Instagram</a>
              <a href={STORE.socials.tiktok} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>TikTok</a>
              <a href={STORE.socials.facebook} target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)" }}>Facebook</a>
            </div>
          </div>

          <div className="card-box" style={{ marginTop: 16 }}>
            <h3>{t("delivery_method")}</h3>
            {ZONES.map(z => <div className="landmark" key={z.id}><b>•</b><span>{z.label} — {z.fee ? money(z.fee) : "Free"}</span></div>)}
            <p className="form-note" style={{ marginTop: 10 }}>Free downtown delivery on orders over {money(60000)}.</p>
          </div>
        </div>
      </div></div>
    </>
  );
}