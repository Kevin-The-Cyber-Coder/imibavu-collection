import { useStore, state } from "../store";
import { t } from "../i18n";
import { PAGES } from "../data";

export default function Static({ slug }) {
  useStore();
  const pg = PAGES[slug];
  if (!pg) {
    return (
      <div className="page-body"><div className="container empty-state">
        <h3>Page not found</h3><a className="btn ghost" href="#/">{t("home")}</a>
      </div></div>
    );
  }
  return (
    <>
      <div className="page-head"><div className="container"><span className="kicker">Imibavu Collection</span><h1>{pg.title}</h1></div></div>
      <div className="page-body"><div className="container"><div className="prose" dangerouslySetInnerHTML={{ __html: pg.body }} /></div></div>
    </>
  );
}