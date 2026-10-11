import { useStore, state, quizPick, quizNext, quizBack, quizRestart, quizResults } from "../store";
import { t } from "../i18n";
import { QUIZ } from "../data";
import { waLink, brandName } from "../utils";
import { FaWhatsapp } from "../components/Icons";
import ProductCard from "../components/ProductCard";

export default function Quiz() {
  useStore();
  const q = state.quiz;
  if (q.step >= 3) {
    const res = quizResults();
    return (
      <div className="page-body"><div className="container quiz-wrap">
        <div className="crumbs center"><a href="#/">Home</a><span>/</span>{t("quiz_title")}</div>
        <div className="center" style={{ marginBottom: 26 }}>
          <span className="kicker">{t("quiz_result")}</span>
          <h1 style={{ fontSize: "clamp(2rem,6vw,3rem)", marginTop: ".2em" }}>Your matches</h1>
          <p className="muted">Based on mood, season and the notes you love.</p>
        </div>
        <div className="product-grid">{res.map(p => <ProductCard key={p.id} p={p} />)}</div>
        <div className="quiz-nav" style={{ justifyContent: "center", marginTop: 26 }}>
          <button className="btn ghost" onClick={quizRestart}>{t("retake")}</button>
          <a className="btn wa-btn" target="_blank" rel="noopener noreferrer"
            href={waLink("Hello Imibavu Collection, the Scent Finder recommended:\n" + res.map(p => "• " + p.name + " (" + brandName(p.brand) + ")").join("\n") + "\nCan you tell me more?")}>
            <FaWhatsapp /> {t("buy_whatsapp")}
          </a>
        </div>
      </div></div>
    );
  }
  const step = q.step;
  const opts = step === 0 ? QUIZ.moods.map(m => [m[0], null, m[1]])
    : step === 1 ? QUIZ.seasons.map(m => [m[0], null, m[1]])
    : QUIZ.notes.map(n => [null, "notes", n]);
  const on = (key, val) => key === "notes" ? q.a.notes.includes(val) : q.a[key] === val;
  return (
    <div className="page-body"><div className="container quiz-wrap">
      <div className="crumbs center"><a href="#/">Home</a><span>/</span>{t("quiz_title")}</div>
      <div className="center" style={{ marginBottom: 22 }}><span className="kicker">{t("quiz_title")}</span><p className="muted">{t("quiz_sub")}</p></div>
      <div className="quiz-progress"><i style={{ width: `${((step + 1) / 3) * 100}%` }} /></div>
      <div className="quiz-q">
        {step === 0 ? t("quiz_mood") : step === 1 ? t("quiz_season") : t("quiz_notes")}
      </div>
      <div className="quiz-opts">
        {opts.map(([key, noteKey, label]) => (
          <button key={label} className={`quiz-opt ${on(noteKey || (step === 0 ? "mood" : "season"), key) ? "on" : ""}`}
            onClick={() => quizPick(noteKey || (step === 0 ? "mood" : "season"), key)}>
            {label}
          </button>
        ))}
      </div>
      {step === 2 && <p className="form-note center" style={{ marginTop: 12 }}>Pick up to 3.</p>}
      <div className="quiz-nav">
        <button className="btn ghost" onClick={quizBack} disabled={step === 0}>{t("back")}</button>
        <button className="btn" onClick={quizNext}>{step === 2 ? t("see_results") : t("next")}</button>
      </div>
    </div></div>
  );
}