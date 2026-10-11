/* Delivery zones & fees — mirrors js/data.js ZONES so totals agree. */
const ZONES = [
  { id: "kk", label: "KK Center & Downtown", fee: 1500 },
  { id: "kimironko", label: "Kimironko / KG", fee: 2500 },
  { id: "nyamirambo", label: "Nyamirambo", fee: 2500 },
  { id: "remera", label: "Remera / Airport", fee: 3000 },
  { id: "pickup", label: "Pickup at T2000 store", fee: 0 },
];

const FREE_DELIVERY_THRESHOLD = 60000;
const PROMO_CODE = "IMIBAVU5";

const findZone = (id) => ZONES.find((z) => z.id === id) || ZONES[0];

function deliveryFee(zoneId, subtotal) {
  const zone = findZone(zoneId);
  if (zone.id === "pickup") return 0;
  if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return zone.fee;
}

module.exports = { ZONES, FREE_DELIVERY_THRESHOLD, PROMO_CODE, findZone, deliveryFee };
