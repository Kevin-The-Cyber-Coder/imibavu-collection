import { stars } from "../utils";

export default function Stars({ r, className }) {
  return <span className={className || "stars"}>{stars(r)}</span>;
}