/* Imibavu Collection — data layer */
export const WA_NUM = "250784804739";

export const STORE = {
  name: "Imibavu Collection",
  phone: "+250784804739",
  phonePretty: "+250 784 804 739",
  address: "Ground floor, T2000 Building, Downtown Kigali, Rwanda",
  hours: [
    ["Mon – Fri", "08:30 – 19:30"],
    ["Saturday", "09:00 – 20:00"],
    ["Sunday", "12:00 – 18:00"]
  ],
  landmarks: [
    "Find the T2000 Building on the main downtown avenue, ground floor.",
    "Opposite the central bus terminal, next to the arcade shops.",
    "Ask for Imibavu Collection at the building reception."
  ],
  mapQuery: "T2000+Building+Kigali+Rwanda",
  socials: {
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/",
    facebook: "https://facebook.com/"
  }
};

export const CATEGORIES = [
  { id: "perfumes", label: "Perfumes" },
  { id: "oils", label: "Oil Blends" },
  { id: "jewelry", label: "Jewelry" }
];

export const GENDERS = ["Men", "Women", "Unisex"];

export const SCENT_FAMILIES = ["Oud", "Woody", "Floral", "Musky", "Fresh", "Sweet", "Amber", "Citrus"];

export const LONGEVITY = [
  { id: "light", label: "Light (3–4h)" },
  { id: "moderate", label: "Moderate (5–7h)" },
  { id: "long", label: "Long-lasting (8h+)" }
];

export let BRANDS = [
  { id: "lattafa", name: "Lattafa", tag: "Trending Arabic" },
  { id: "mousuf", name: "Mousuf", tag: "Trending Arabic" },
  { id: "alhambra", name: "Alhambra", tag: "Designer-inspired" },
  { id: "imibavu", name: "Imibavu House", tag: "Custom blends" },
  { id: "nabeel", name: "Nabeel", tag: "Arabic" },
  { id: "imibavu-jewels", name: "Imibavu Jewels", tag: "Minimalist jewelry" }
];

/* size options: [ml, price RWF] — the API catalog replaces this at boot */
export let PRODUCTS = [
  {
    id: "khamrah", name: "Khamrah", brand: "lattafa", category: "perfumes",
    gender: "Unisex", family: "Sweet", longevity: "long",
    price: 45000, sizes: [[30, 26000], [50, 45000], [100, 78000]],
    stock: "in", trending: true, isNew: false, inspired: null,
    color: "#7b4b2a",
    notes: { top: ["Cinnamon", "Nutmeg", "Bergamot"], heart: ["Date", "Prune", "Tuberose"], base: ["Vanilla", "Tonka", "Amberwood"] },
    rating: 4.8, reviews: 126,
    season: "Evening · Autumn · Winter",
    desc: "A rich gourmand oud that has taken Kigali by warm. Sweet, spiced and impossible to forget — the fragrance people stop you about."
  },
  {
    id: "asad", name: "Asad", brand: "lattafa", category: "perfumes",
    gender: "Men", family: "Amber", longevity: "long",
    price: 39000, sizes: [[50, 39000], [100, 69000]],
    stock: "low", trending: true, isNew: false, inspired: "Designer-inspired",
    color: "#2f2f38",
    notes: { top: ["Black Pepper", "Pineapple"], heart: ["Incense", "Coffee"], base: ["Leather", "Amber", "Patchouli"] },
    rating: 4.7, reviews: 98,
    season: "Evening · Office · Winter",
    desc: "Smoky, peppery and confident. A powerful signature scent built for long Kigali nights and important meetings alike."
  },
  {
    id: "yara", name: "Yara", brand: "lattafa", category: "perfumes",
    gender: "Women", family: "Floral", longevity: "moderate",
    price: 42000, sizes: [[30, 24000], [50, 42000], [100, 72000]],
    stock: "in", trending: true, isNew: false, inspired: null,
    color: "#e8a7b8",
    notes: { top: ["Orange", "Mandarin", "Heliotrope"], heart: ["Tropical Fruits", "Ylang"], base: ["Vanilla", "Musk", "Amber"] },
    rating: 4.9, reviews: 214,
    season: "Day · Spring · Summer",
    desc: "Soft, milky and quietly addictive. A minimalist compliment-getter that never overwhelms a room."
  },
  {
    id: "mousuf-oriental", name: "Mousuf Oriental", brand: "mousuf", category: "perfumes",
    gender: "Men", family: "Woody", longevity: "long",
    price: 36000, sizes: [[50, 36000], [100, 64000]],
    stock: "in", trending: true, isNew: false, inspired: null,
    color: "#5a4632",
    notes: { top: ["Cardamom", "Lemon"], heart: ["Rose", "Saffron"], base: ["Sandalwood", "Musk", "Oud"] },
    rating: 4.6, reviews: 73,
    season: "Office · Evening · All year",
    desc: "The Mousuf classic — oriental woods wrapped in saffron and rose, worn by men across Kigali."
  },
  {
    id: "mousuf-noir", name: "Mousuf Noir", brand: "mousuf", category: "perfumes",
    gender: "Unisex", family: "Musky", longevity: "moderate",
    price: 38000, sizes: [[50, 38000]],
    stock: "in", trending: false, isNew: true, inspired: null,
    color: "#1d1d22",
    notes: { top: ["Pink Pepper", "Bergamot"], heart: ["Iris", "Violet"], base: ["Musk", "Cedar", "Tonka"] },
    rating: 4.5, reviews: 31,
    season: "Evening · Autumn",
    desc: "A clean, skin-like musk with powdery iris. Minimalist in the truest sense — close, warm, personal."
  },
  {
    id: "anas-24h", name: "24 Hours", brand: "alhambra", category: "perfumes",
    gender: "Men", family: "Fresh", longevity: "long",
    price: 34000, sizes: [[50, 34000], [100, 59000]],
    stock: "in", trending: true, isNew: false, inspired: "Designer-inspired",
    color: "#3c6e8f",
    notes: { top: ["Grapefruit", "Mint", "Lavender"], heart: ["Geranium", "Spices"], base: ["Amber", "Cedar", "Patchouli"] },
    rating: 4.7, reviews: 87,
    season: "Office · Summer · Day",
    desc: "Our best long-lasting summer pick — fresh, aromatic and still going after a full working day in the heat."
  },
  {
    id: "brasilia", name: "Brasilia Carbon", brand: "alhambra", category: "perfumes",
    gender: "Women", family: "Sweet", longevity: "moderate",
    price: 33000, sizes: [[50, 33000]],
    stock: "out", trending: false, isNew: false, inspired: "Designer-inspired",
    color: "#c98a5e",
    notes: { top: ["Passionfruit", "Pineapple"], heart: ["Vanilla", "Caramel"], base: ["Sandalwood", "Musk"] },
    rating: 4.4, reviews: 52,
    season: "Day · Spring",
    desc: "Fruity, creamy and playful. A summer sweet that stays bright from morning to late afternoon."
  },
  {
    id: "nabeel-black", name: "Black Oud", brand: "nabeel", category: "perfumes",
    gender: "Unisex", family: "Oud", longevity: "long",
    price: 52000, sizes: [[50, 52000], [100, 92000]],
    stock: "low", trending: false, isNew: false, inspired: null,
    color: "#33221a",
    notes: { top: ["Saffron", "Bergamot"], heart: ["Taif Rose", "Oud"], base: ["Amber", "Leather", "Vanilla"] },
    rating: 4.9, reviews: 64,
    season: "Evening · Formal · Winter",
    desc: "Deep Cambodian-style oud with rose and saffron. Formal, luxurious, made for weddings and special nights."
  },
  {
    id: "rosa-musk", name: "Rosa Musk", brand: "lattafa", category: "perfumes",
    gender: "Women", family: "Floral", longevity: "moderate",
    price: 31000, sizes: [[50, 31000]],
    stock: "in", trending: false, isNew: true, inspired: null,
    color: "#d98a9a",
    notes: { top: ["Litchi", "Bergamot"], heart: ["Rose", "Peony"], base: ["White Musk", "Vanilla"] },
    rating: 4.6, reviews: 45,
    season: "Day · Summer · Office",
    desc: "Fresh rose on clean white musk. The kind of scent that feels like freshly pressed linen."
  },
  {
    id: "vermell", name: "Vermell Elixir", brand: "imibavu", category: "perfumes",
    gender: "Unisex", family: "Amber", longevity: "long",
    price: 47000, sizes: [[50, 47000], [100, 84000]],
    stock: "in", trending: false, isNew: true, inspired: null,
    color: "#8a2f3c",
    notes: { top: ["Blood Orange", "Saffron"], heart: ["Oud", "Jasmine"], base: ["Amber", "Benzoin", "Musk"] },
    rating: 4.8, reviews: 22,
    season: "Evening · Winter",
    desc: "The Imibavu house signature — blood orange opening into golden amber and oud."
  },
  {
    id: "oil-oud-royal", name: "Oud Royal Roll-On", brand: "imibavu", category: "oils",
    gender: "Unisex", family: "Oud", longevity: "long",
    price: 18000, sizes: [[10, 18000], [20, 30000]],
    stock: "in", trending: true, isNew: false, inspired: null,
    color: "#4a3521",
    notes: { top: ["Saffron"], heart: ["Oud", "Rose"], base: ["Amber", "Musk"] },
    rating: 4.9, reviews: 156,
    season: "Evening · All year",
    desc: "Pure concentration oil that lasts through the day. Two dabs on the pulse points and you are done."
  },
  {
    id: "oil-white-musk", name: "White Musk Oil", brand: "imibavu", category: "oils",
    gender: "Women", family: "Musky", longevity: "moderate",
    price: 15000, sizes: [[10, 15000], [20, 25000]],
    stock: "in", trending: false, isNew: false, inspired: null,
    color: "#cfc7bb",
    notes: { top: ["Bergamot"], heart: ["Orange Blossom"], base: ["White Musk", "Vanilla"] },
    rating: 4.7, reviews: 88,
    season: "Day · All year",
    desc: "Soft, clean and skin-sweet. An everyday oil for work, prayer and everything in between."
  },
  {
    id: "oil-vanilla-cashmere", name: "Vanilla Cashmere Oil", brand: "imibavu", category: "oils",
    gender: "Unisex", family: "Sweet", longevity: "long",
    price: 17000, sizes: [[10, 17000], [20, 28000]],
    stock: "low", trending: true, isNew: true, inspired: null,
    color: "#c9a06a",
    notes: { top: ["Almond"], heart: ["Vanilla Orchid"], base: ["Sandalwood", "Tonka"] },
    rating: 4.8, reviews: 61,
    season: "Evening · Winter",
    desc: "Creamy vanilla folded into sandalwood — gourmand comfort in a pocket-size roll-on."
  },
  {
    id: "oil-citrus-fresh", name: "Citrus Fresh Oil", brand: "imibavu", category: "oils",
    gender: "Unisex", family: "Citrus", longevity: "light",
    price: 14000, sizes: [[10, 14000]],
    stock: "in", trending: false, isNew: false, inspired: null,
    color: "#d8b44a",
    notes: { top: ["Lemon", "Sweet Orange"], heart: ["Neroli"], base: ["Vetiver"] },
    rating: 4.5, reviews: 39,
    season: "Day · Summer",
    desc: "A bright pick-me-up oil for hot Kigali afternoons. Zesty, light and instantly refreshing."
  },
  {
    id: "oil-royal-oud-sampler", name: "Arabic Oud Sampler Set", brand: "imibavu", category: "oils",
    gender: "Unisex", family: "Woody", longevity: "long",
    price: 32000, sizes: [["4 × 10 ml", 32000]],
    stock: "in", trending: false, isNew: true, inspired: null,
    color: "#6b4f2f",
    notes: { top: ["Saffron", "Cardamom"], heart: ["Oud", "Taif Rose"], base: ["Amber", "Musk"] },
    rating: 4.9, reviews: 27,
    season: "Gift · All year",
    desc: "Four signature oils — Oud Royal, White Musk, Vanilla Cashmere and Citrus Fresh — in one gift box."
  },
  {
    id: "necklace-minimal", name: "Minimal Bar Pendant", brand: "imibavu-jewels", category: "jewelry",
    gender: "Women", family: "Fresh", longevity: "light",
    price: 24000, sizes: [["40 cm", 24000], ["45 cm", 26000]],
    stock: "in", trending: true, isNew: false, inspired: null,
    color: "#b9a06a",
    notes: { top: [], heart: [], base: [] },
    rating: 4.7, reviews: 43,
    season: "Everyday · Office",
    desc: "A slender polished bar on a fine chain. Tarnish-resistant plating, made to be worn every day."
  },
  {
    id: "hoops-thin", name: "Thin Gold Hoops", brand: "imibavu-jewels", category: "jewelry",
    gender: "Women", family: "Fresh", longevity: "light",
    price: 18000, sizes: [["S", 18000], ["M", 18000]],
    stock: "in", trending: false, isNew: true, inspired: null,
    color: "#cfae6b",
    notes: { top: [], heart: [], base: [] },
    rating: 4.8, reviews: 66,
    season: "Everyday",
    desc: "Barely-there hoops that catch the light. Lightweight enough to forget you are wearing them."
  },
  {
    id: "bracelet-beads", name: "Scent Bead Bracelet", brand: "imibavu-jewels", category: "jewelry",
    gender: "Unisex", family: "Woody", longevity: "light",
    price: 21000, sizes: [["S", 21000], ["M", 21000], ["L", 21000]],
    stock: "low", trending: false, isNew: false, inspired: null,
    color: "#7a6449",
    notes: { top: [], heart: [], base: [] },
    rating: 4.6, reviews: 34,
    season: "Everyday · Summer",
    desc: "Porous sandalwood beads that hold your favourite oil — jewelry that carries your scent all day."
  },
  {
    id: "pendant-onyx", name: "Onyx Circle Pendant", brand: "imibavu-jewels", category: "jewelry",
    gender: "Men", family: "Woody", longevity: "light",
    price: 29000, sizes: [["50 cm", 29000]],
    stock: "in", trending: false, isNew: false, inspired: null,
    color: "#2b2b30",
    notes: { top: [], heart: [], base: [] },
    rating: 4.7, reviews: 29,
    season: "Evening · Office",
    desc: "Matte black onyx disc on a steel chain — a quiet statement piece for men who keep it simple."
  },
  {
    id: "gift-set-duo", name: "Gift Set — Scent + Style", brand: "imibavu", category: "perfumes",
    gender: "Unisex", family: "Amber", longevity: "long",
    price: 68000, sizes: [["50 ml + pendant", 68000]],
    stock: "in", trending: true, isNew: false, inspired: null,
    color: "#9b7b4f",
    notes: { top: ["Blood Orange"], heart: ["Oud", "Jasmine"], base: ["Amber", "Musk"] },
    rating: 4.9, reviews: 18,
    season: "Gift · All year",
    desc: "Vermell Elixir 50 ml paired with the Minimal Bar Pendant, boxed and ribboned — ready to gift."
  },
  {
    id: "summer-trio", name: "Summer Long-Lasting Trio", brand: "imibavu", category: "perfumes",
    gender: "Unisex", family: "Fresh", longevity: "long",
    price: 55000, sizes: [["3 × 30 ml", 55000]],
    stock: "in", trending: true, isNew: true, inspired: null,
    color: "#4f8a8b",
    notes: { top: ["Grapefruit", "Lemon"], heart: ["Lavender", "Geranium"], base: ["Amber", "Cedar"] },
    rating: 4.8, reviews: 41,
    season: "Summer · Day · Travel",
    desc: "Three travel-size performers chosen for Kigali heat: fresh, aromatic and still there at sunset."
  }
];

export const COLLECTIONS = [
  { id: "trending", label: "Trending", match: p => p.trending },
  { id: "summer", label: "Summer Long-Lasting", match: p => p.longevity === "long" && (p.family === "Fresh" || p.family === "Citrus" || p.season.includes("Summer")) },
  { id: "bestsellers", label: "Best Sellers", match: p => p.rating >= 4.7 && p.reviews >= 40 },
  { id: "gifts", label: "Gift Picks", match: p => p.season.includes("Gift") || p.category === "jewelry" },
  { id: "new", label: "New Arrivals", match: p => p.isNew },
  { id: "inspired", label: "Designer-Inspired", match: p => !!p.inspired }
];

export const BLEND_BASES = [
  { id: "jojoba", label: "Jojoba Oil", price: 6000, note: "Light, odourless, best for daily wear" },
  { id: "sweet-almond", label: "Sweet Almond Oil", price: 5000, note: "Soft, nourishing, gentle on skin" },
  { id: "fractionated-coconut", label: "Fractionated Coconut", price: 5500, note: "Clear, non-greasy, long shelf life" },
  { id: "grapeseed", label: "Grapeseed Oil", price: 5000, note: "Thin and fast-absorbing" }
];

export const BLEND_NOTES = [
  "Oud", "Rose", "Vanilla", "Sandalwood", "White Musk", "Amber",
  "Bergamot", "Jasmine", "Cardamom", "Leather", "Coconut", "Neroli",
  "Saffron", "Cedar", "Patchouli", "Tonka Bean"
];

export const BLEND_SIZES = [
  { label: "10 ml Roll-On", price: 9000 },
  { label: "30 ml Bottle", price: 18000 },
  { label: "50 ml Bottle", price: 26000 }
];

export const POPULAR_BLENDS = [
  { name: "Kigali Nights", base: "jojoba", notes: ["Oud", "Saffron", "Amber"], size: 1 },
  { name: "Soft Morning", base: "sweet-almond", notes: ["White Musk", "Vanilla", "Neroli"], size: 1 },
  { name: "Sandal Dusk", base: "fractionated-coconut", notes: ["Sandalwood", "Tonka Bean", "Rose"], size: 2 },
  { name: "Fresh Desk", base: "grapeseed", notes: ["Bergamot", "Cedar", "White Musk"], size: 1 }
];

export const PAST_BLENDS = [
  { name: "Golden Hour", notes: "Amber · Tonka · Bergamot", by: "Aline U." },
  { name: "Marble Skin", notes: "White Musk · Neroli · Vanilla", by: "Diane K." },
  { name: "Boardroom", notes: "Cedar · Cardamom · Leather", by: "Patrick H." },
  { name: "Rooftop Kigali", notes: "Oud · Rose · Saffron", by: "Sifa M." },
  { name: "Sunday Clean", notes: "Coconut · Musk · Neroli", by: "Grace N." },
  { name: "Midnight Oud", notes: "Oud · Patchouli · Amber", by: "Yves B." }
];

export const ZONES = [
  { id: "kk", label: "KK Center & Downtown", fee: 1500 },
  { id: "kimironko", label: "Kimironko / KG", fee: 2500 },
  { id: "nyamirambo", label: "Nyamirambo", fee: 2500 },
  { id: "remera", label: "Remera / Airport", fee: 3000 },
  { id: "pickup", label: "Pickup at T2000 store", fee: 0 }
];

export const TESTIMONIALS = [
  { name: "Aline Uwase", stars: 5, text: "Khamrah from Imibavu lasts the whole day on me. The team helped me choose without pushing the expensive one.", img: "AU" },
  { name: "Patrick Habimana", stars: 5, text: "Ordered on WhatsApp at 4pm, delivered to Kimironko the same evening. Genuine Lattafa, sealed box.", img: "PH" },
  { name: "Diane Keza", stars: 5, text: "I asked for a custom blend with vanilla and white musk. They mixed it while I waited and saved it to reorder.", img: "DK" },
  { name: "Sifa Mukamana", stars: 4, text: "Beautiful minimalist jewelry. The gold hoops go with everything and the packaging felt like a real gift.", img: "SM" },
  { name: "Yves Bimenyimana", stars: 5, text: "Best perfume shop downtown. The 24 Hours scent is my summer signature now — still there after work.", img: "YB" }
];

export const FAQS = [
  { q: "Are your fragrances original and authentic?", a: "Yes. Every perfume is sourced from authorised distributors and arrives factory-sealed. You can check the batch code on the box, and we accept returns on any item you believe is not genuine." },
  { q: "How do I order on WhatsApp?", a: "Tap the Order on WhatsApp button on any product. The message is pre-filled with the product name, size and page link — just press send. We reply with availability, total and payment options." },
  { q: "Which payment methods do you accept?", a: "MTN Mobile Money, Airtel Money, cash on delivery, and cash or card when you pick up at our T2000 store. No account or card is required to order." },
  { q: "Do you deliver outside Kigali?", a: "We deliver anywhere in Kigali with zone-based fees, and pickup is always free at the store. For upcountry orders we can arrange bus-parcel delivery — contact us on WhatsApp." },
  { q: "How long does delivery take?", a: "Same day for orders confirmed before 3pm, next day otherwise. You receive an SMS or WhatsApp confirmation with the status of your order." },
  { q: "Can I return a perfume I do not like?", a: "Unopened and sealed items can be exchanged within 7 days. For opened fragrances we offer a store credit or an exchange of equal value — see our Returns page for details." },
  { q: "How long do your perfumes and oils last?", a: "Our Eau de Parfums typically last 6 to 10 hours depending on skin and weather. Concentrated roll-on oils last longer on pulse points — most customers get a full day from two dabs." },
  { q: "What is a custom blend and how does it work?", a: "You choose a base oil, two or three scent notes and a bottle size. We mix it in store, label it with your name, and save it so you can reorder the exact same blend later." },
  { q: "Can I book a blending session?", a: "Yes — use the booking form on the Custom Blends page to request a date and time. Sessions are free, take about 30 minutes, and there is no obligation to buy." },
  { q: "Do you have gift sets?", a: "Yes. We offer perfume + jewelry gift sets, sampler boxes and gift cards. Everything can be wrapped with a handwritten note on request." }
];

export const ARTICLES = [
  { title: "How to make perfume last all day", text: "Moisturise first — fragrance clings to hydrated skin. Spray on pulse points (wrists, neck, behind ears) from about 15 cm, and never rub, it breaks the top notes." },
  { title: "Where to store your fragrances", text: "Keep bottles away from direct sun and humidity. The bathroom shelf is the worst spot; a drawer or a box in the bedroom keeps the formula stable for years." },
  { title: "Oil or spray — which should you choose?", text: "Oils are subtle, close to the skin and travel-friendly, ideal for offices and prayer. Sprays project further and suit evenings and open spaces. Many of our customers wear both." },
  { title: "Reading a scent pyramid", text: "Top notes are the first 15 minutes, heart notes the next two hours, base notes the dry-down that lasts all day. Buy based on the base notes — that is what people smell on you later." }
];

export const DELIVERY_PROMO = { text: "Free delivery in downtown Kigali on orders over 60,000 RWF", code: "IMIBAVU5" };

export const QUIZ = {
  moods: [["fresh", "Fresh & clean"], ["sweet", "Sweet & inviting"], ["oud", "Deep & mysterious"], ["musky", "Soft & skin-like"]],
  seasons: [["summer", "Hot days & summer"], ["day", "Office & everyday"], ["evening", "Evenings & going out"], ["winter", "Cool evenings & events"]],
  notes: ["Oud", "Vanilla", "Rose", "Musk", "Citrus", "Amber"]
};

export const PAGES = {
  returns: {
    title: "Returns & Exchanges",
    body: `<p>Unopened and factory-sealed items can be exchanged or returned within <b>7 days</b> of purchase with the original receipt.</p>
      <p>Opened fragrances: because of hygiene, we cannot resell them — but we still want you happy. We offer an <b>exchange of equal value</b> or store credit within 7 days, provided at least 70% of the product remains.</p>
      <p>Custom blends and engraved jewelry are made for you and cannot be returned, unless there is a mixing error on our side — in that case we remake it free.</p>
      <p>Delivery issues: if an item arrives damaged or wrong, message us on WhatsApp with a photo within 24 hours and we replace it the same day.</p>`
  },
  privacy: {
    title: "Privacy Policy",
    body: `<p>We only collect what we need to deliver your order: name, phone number, delivery address and optional email. We never sell your data.</p>
      <p>Payments via MTN MoMo and Airtel Money are processed by the mobile operators — we never see or store your PIN.</p>
      <p>WhatsApp and email broadcasts are opt-out at any time by replying STOP. Order records are kept for accounting and warranty purposes.</p>
      <p>This site stores only local preferences (language, cart, wishlist) in your browser. Secure checkout runs over HTTPS.</p>`
  },
  authenticity: {
    title: "Authenticity & Sourcing",
    body: `<p>Every fragrance at Imibavu Collection is sourced from authorised distributors and arrives <b>factory-sealed</b> with an intact batch code you can verify.</p>
      <p>We do not sell refills, decants from unknown sources, or "inspired" oils labelled as originals. Designer-inspired fragrances are clearly tagged as <b>Inspired by</b> on their product page — they are legal alternative compositions, never counterfeit branding.</p>
      <p>If you ever believe a product you bought from us is not genuine, bring it back with the box and we refund in full.</p>`
  },
  care: {
    title: "Fragrance Care Tips",
    body: ARTICLES.map(a => `<h3>${a.title}</h3><p>${a.text}</p>`).join("")
  }
};