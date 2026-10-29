import { useEffect, useState } from "react";
import { realImg, productImg, neutralImg } from "../utils";

/* Real-photo placeholder for a product, keyed by product id so it is stable.
   Falls back to the branded SVG art if the image cannot load (e.g. offline). */
export default function ProductImage({ product, view = 0, alt, className, loading }) {
  const [err, setErr] = useState(false);
  /* Prefer an image uploaded by staff; fall back to the branded placeholder. */
  const imgs = Array.isArray(product.images) ? product.images : [];
  const raw = imgs[view] || imgs[0];
  let uploaded = raw ? (typeof raw === "string" ? raw : raw.url || "") : "";
  if (!uploaded && product.image) uploaded = product.image;
  useEffect(() => { setErr(false); }, [product.id, view, uploaded]);
  const src = uploaded && !err ? uploaded : err ? productImg(product, view) : realImg(`${product.id}-${view}`, 700, 875);
  return (
    <img className={className} src={src} alt={alt || product.name} loading={loading} onError={() => setErr(true)} />
  );
}

/* Generic real-photo placeholder for non-product imagery (store, gallery…). */
export function RealImage({ seed, w = 700, h = 875, alt, className, loading }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [seed]);
  const src = err ? neutralImg() : realImg(seed, w, h);
  return (
    <img className={className} src={src} alt={alt || ""} loading={loading} onError={() => setErr(true)} />
  );
}