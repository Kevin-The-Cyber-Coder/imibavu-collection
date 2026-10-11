import { useState } from "react";
import { useStore, state, blendCalc, blendBaseSet, blendNote, blendSizeSet, blendNameSet, blendSave, pickCombo, blendLoad, blendDel, bookSession } from "../store";
import { t } from "../i18n";
import { BLEND_BASES, BLEND_NOTES, BLEND_SIZES, POPULAR_BLENDS, PAST_BLENDS } from "../data";
import { money, waLink, realImg } from "../utils";
import { FaWhatsapp, FiMinus, FiPlus } from "../components/Icons";
import SectionHead from "../components/SectionHead";

const STEPS = [
  "Jojoba, almond, coconut or grapeseed — each changes the feel on skin.",
  "Oud, rose, vanilla, musk, citrus… build the pyramid you love.",
  "Roll-on for travel, bottle for the dresser.",
  "Labelled with your name and saved to your account for easy reorders.",
];

export default function Blends() {
  useStore();
  const { base, size, notes, total } = blendCalc();
  const [bf, setBf] = useState({ name: "", phone: "", date: "", time: "", msg: "" });
  const bottleColors = ["#b08d4f", "#8e6b3f", "#c9a86a", "#7a6449"];
  return (
    <>
      <section className="page-head"><div className="container">
        <span className="kicker">Signature service</span><h1>{t("blends_title")}</h1>
        <p>{t("blends_sub")}</p>
        <div style={{ marginTop: 16 }}><a className="btn" href="#book">{t("book_session")}</a></div>
      </div></section>

      <div className="page-body"><div className="container">
        <section style={{ marginBottom: 34 }}>
          <SectionHead title={t("how_works")} />
          <div className="steps">
            {[1, 2, 3, 4].map(i => (
              <div className="step" key={i}><span className="n">0{i}</span><h4>{t("step" + i)}</h4><p>{STEPS[i - 1]}</p></div>
            ))}
          </div>
        </section>

        <section id="builder">
          <SectionHead title={t("blend_builder")} />
          <div className="builder">
            <div className="builder-card">
              <div className="f-group" style={{ marginBottom: 20 }}>
                <span className="f-label">{t("base_oil")}</span>
                <div className="stack">
                  {BLEND_BASES.map(b => (
                    <label className={`radio-card ${base.id === b.id ? "on" : ""}`} key={b.id}>
                      <input type="radio" name="base" checked={base.id === b.id} onChange={() => blendBaseSet(b.id)} />
                      <span><b>{b.label} — {money(b.price)}</b><span>{b.note}</span></span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="f-group" style={{ marginBottom: 20 }}>
                <span className="f-label">{t("choose_notes")} <em style={{ color: "var(--gold)", fontStyle: "normal" }}>({notes.length}/3)</em></span>
                <div className="note-pool">
                  {BLEND_NOTES.map(n => <button className={`chip ${notes.includes(n) ? "on" : ""}`} key={n} onClick={() => blendNote(n)}>{n}</button>)}
                </div>
              </div>

              <div className="f-group" style={{ marginBottom: 20 }}>
                <span className="f-label">{t("size")}</span>
                <div className="size-opts">
                  {BLEND_SIZES.map((s, i) => (
                    <button className={`size-opt ${(state.blendSize ?? 1) === i ? "on" : ""}`} key={i} onClick={() => blendSizeSet(i)}>
                      {s.label}<small>{money(s.price)}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field"><label>{t("blend_name")}</label>
                <input value={state.blendName || ""} placeholder="e.g. Kigali Nights" onChange={e => blendNameSet(e.target.value)} /></div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <button className="btn" onClick={blendSave}>{t("save_blend")}</button>
                <a className="btn wa-btn" target="_blank" rel="noopener noreferrer"
                  href={waLink(`Hello Imibavu Collection, I would like this custom blend:\n• Base: ${base.label}\n• Notes: ${notes.join(", ") || "(to discuss)"}\n• Size: ${size.label}\n• Name: ${state.blendName || "—"}\nTotal: ${money(total)}`)}>
                  <FaWhatsapp /> {t("buy_whatsapp")}
                </a>
              </div>
            </div>

            <div className="blend-preview">
              <h4>{t("chosen")}</h4>
              <div className="bottle" style={{ ["--blend-c"]: bottleColors[BLEND_BASES.indexOf(base)] }}>
                <span>{state.blendName || "Your blend"}</span>
              </div>
              <div className="blend-line"><span>{t("base_oil")}</span><b>{base.label}</b></div>
              <div className="blend-line"><span>{t("notes")}</span><b>{notes.length ? notes.join(" · ") : "—"}</b></div>
              <div className="blend-line"><span>{t("size")}</span><b>{size.label}</b></div>
              <div className="blend-total"><span>{t("total")}</span><span>{money(total)}</span></div>
              {state.blendNotes && state.blendNotes.length > 0 && (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button className="mini-btn" onClick={() => blendNote(state.blendNotes[0])}><FiMinus /> clear</button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="section">
          <SectionHead title={t("popular_combos")} />
          <div className="combo-grid">
            {POPULAR_BLENDS.map((b, i) => (
              <div className="combo" key={b.name}>
                <b>{b.name}</b><p>{b.notes.join(" · ")}</p>
                <button className="btn ghost sm" onClick={() => pickCombo(i)}>Use this</button>
              </div>
            ))}
          </div>
        </section>

        <section className="section" id="book" style={{ background: "var(--bg-2)", borderBlock: "1px solid var(--line)" }}>
          <div className="container">
            <SectionHead title={t("book_session")} sub="Free, about 30 minutes, no obligation to buy." />
            <form className="form-grid two" style={{ maxWidth: 820 }} onSubmit={e => { e.preventDefault(); bookSession(bf); }}>
              <div className="field"><label>{t("full_name")}</label><input required value={bf.name} onChange={e => setBf({ ...bf, name: e.target.value })} /></div>
              <div className="field"><label>{t("phone")}</label><input type="tel" placeholder="+250…" required value={bf.phone} onChange={e => setBf({ ...bf, phone: e.target.value })} /></div>
              <div className="field"><label>{t("book_date")}</label><input type="date" required value={bf.date} onChange={e => setBf({ ...bf, date: e.target.value })} /></div>
              <div className="field"><label>{t("book_time")}</label><input type="time" required value={bf.time} onChange={e => setBf({ ...bf, time: e.target.value })} /></div>
              <div className="field" style={{ gridColumn: "1/-1" }}><label>{t("book_msg")}</label><textarea placeholder="Notes you love, occasion, budget…" value={bf.msg} onChange={e => setBf({ ...bf, msg: e.target.value })} /></div>
              <div style={{ gridColumn: "1/-1" }}><button className="btn" type="submit">{t("send_request")}</button></div>
            </form>
          </div>
        </section>

        <section className="section">
          <SectionHead title={t("past_work")} />
          <div className="gallery-grid">
            {PAST_BLENDS.map(b => (
              <div key={b.name} className="gallery-item"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.55)), url(${realImg("blend-" + b.name.split(" ")[0].toLowerCase(), 700, 700)})`, backgroundSize: "cover" }}>
                <div><b>{b.name}</b><span>{b.notes}</span><span>{b.by}</span></div>
              </div>
            ))}
          </div>
        </section>

        {state.blends.length > 0 && (
          <section className="section" style={{ paddingTop: 0 }}>
            <SectionHead title={t("saved_blends")} />
            {state.blends.map((b, i) => (
              <div className="list-card" key={b.id || b.name + i}>
                <div className="avatar" style={{ borderRadius: 12 }}>BL</div>
                <div className="lc-info"><b>{b.name}</b><span>{b.baseLabel} · {b.notes.join(" · ")} · {b.sizeLabel}</span></div>
                <div className="row-actions">
                  <button className="mini-btn" onClick={() => blendLoad(i)}>{t("reorder")}</button>
                  <a className="mini-btn" target="_blank" rel="noopener noreferrer"
                    href={waLink(`Hello Imibavu Collection, I would like to reorder my blend:\n• ${b.name}\n• Base: ${b.baseLabel}\n• Notes: ${b.notes.join(", ")}\n• ${b.sizeLabel}`)}>WhatsApp</a>
                  <button className="mini-btn" onClick={() => blendDel(i)}><FiPlus style={{ transform: "rotate(45deg)" }} /></button>
                </div>
              </div>
            ))}
          </section>
        )}
      </div></div>
    </>
  );
}