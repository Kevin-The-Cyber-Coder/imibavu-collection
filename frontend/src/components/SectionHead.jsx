import { t } from "../i18n";

export default function SectionHead({ title, sub, href, moreKey }) {
  return (
    <div className="section-head">
      <div>{title ? <h2>{title}</h2> : null}{sub ? <p>{sub}</p> : null}</div>
      {href ? <a className="link-more" href={href}>{moreKey ? t(moreKey) : "See all"}</a> : null}
    </div>
  );
}