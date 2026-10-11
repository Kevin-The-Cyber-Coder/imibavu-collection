# Imibavu Collection

**Minimalist perfumes, oil blends & jewelry — boutique e-commerce web app (React SPA + Express/MongoDB API).**

A complete, mobile-first storefront for the Imibavu Collection shop in downtown Kigali (T2000 Building). Customers can browse the catalogue, filter and search, build custom fragrance blends, take a scent-finder quiz, order with Mobile Money/card/cash delivery, and track orders. Staff get a full back-office dashboard for products, orders, promotions and reviews.

---

## Repository layout

```
imibavu/
├── backend/            # Node.js + Express + MongoDB REST API
├── frontend/           # React app (Create React App), doubles as the design system
├── start-servers.ps1   # Launcher: starts API (:5000) + frontend (:3000) and opens the browser
└── .gitignore
```

The legacy static site (`index.html`, `css/`, `js/`, `assets/`, `serve.js`) was fully migrated into `frontend/` (React) and `backend/` (API) and is no longer part of the repo.

---

## Tech stack

### Frontend (`frontend/`)
- **React 19** + **Create React App 5** (`react-scripts`)
- **Hash-based SPA routing** (`#/…`) — no server-side routing needed, works on any static host
- **react-icons** (Feather + FontAwesome sets) for all icons
- **External store pattern** — a mutable singleton `state` object + `notify()/useStore()` hook (React `useSyncExternalStore`) powers every page
- **Trilingual** UI — English, Kinyarwanda, French (`src/i18n.js`)
- CSS design system in `src/index.css` (all original styles + React/icon additions)

### Backend (`backend/`)
- **Node.js + Express 4**
- **MongoDB via Mongoose 8**
- **JWT auth** (`jsonwebtoken`) with access + refresh tokens, `bcryptjs` password hashing
- **OTP phone verification** — Africa's Talking SMS in production, console logging in dev (`SMS_MODE=console`)
- **Payments** — Flutterwave (Mobile Money / card) in production, full local simulation in dev (`PAYMENTS_MODE=console`)
- **Request safety** — `helmet`, `cors`, `express-mongo-sanitize`, `express-rate-limit`, input validation with `zod`
- **Logging** — `pino` + `pino-http`

---

## Getting started

1. **Prerequisites**
   - Node.js 18+ (tested on v22)
   - MongoDB running locally (`mongodb://127.0.0.1:27017/imibavu`) — or set `MONGODB_URI` to an Atlas cluster
   - `npm` available

2. **Install dependencies**
   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```

3. **Configure the API** — copy the template and adjust:
   ```bash
   cd backend
   copy .env.example .env
   ```
   At minimum set `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. SMS and Flutterwave keys are optional (console mode works out of the box).

4. **Seed the database** (creates the catalogue, brands, delivery zones, loyalty rules and the admin account):
   ```bash
   cd backend
   npm run seed
   ```
   > Demo admin: `admin@imibavucollection.rw` / `Admin123`

5. **Run**
   ```bash
   cd backend   && npm start        # API   → http://localhost:5000
   cd frontend  && npm start        # Site  → http://localhost:3000
   ```
   Or double-click / run the launcher:
   ```bash
   powershell -ExecutionPolicy Bypass -File start-servers.ps1
   ```
   It starts both servers and opens `http://localhost:3000`.

6. **Verify** — API health: `http://localhost:5000/api/v1/health` → `{"status":"ok","db":"up",…}`

---

## Backend environment variables (`backend/.env`)

| Variable | Description | Example / default |
|---|---|---|
| `PORT` | API port | `5000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/imibavu` |
| `CORS_ORIGINS` | Comma-separated allowed origins (credentials) | `http://localhost:3000` |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens | 48-byte hex |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens | 48-byte hex |
| `ACCESS_TOKEN_TTL` | e.g. `15m` | `15m` |
| `REFRESH_TOKEN_DAYS` | Refresh token lifetime in days | `7` |
| `ADMIN_NAME/PHONE/EMAIL/PASSWORD` | Admin created by `npm run seed` | `admin@imibavucollection.rw` / `Admin123` |
| `SMS_MODE` | `console` (log OTPs) or `sms` (real) | `console` |
| `AT_API_KEY`, `AT_USERNAME`, `AT_SENDER_ID` | Africa's Talking credentials (real SMS) | |
| `PAYMENTS_MODE` | `console` (simulate) or `flutterwave` (real charges) | `console` |
| `FLW_PUBLIC_KEY`, `FLW_SECRET_KEY`, `FLW_SECRET_HASH` | Flutterwave credentials | |
| `PAYMENTS_CURRENCY` | `RWF` | `RWF` |
| `PAYMENTS_REDIRECT_URL` | Post-payment redirect | `http://localhost:3000` |
| `API_BASE_URL` | Public API base for links | `http://localhost:5000/api/v1` |
| `STORE_PHONE` | WhatsApp/business number in messages | `+250784804739` |

Frontend API address is `http://localhost:5000/api/v1` by default and can be overridden with `REACT_APP_API_BASE` (see `frontend/src/config.js`).

---

## API overview

Base URL: `http://localhost:5000/api/v1` · Auth: `Authorization: Bearer <accessToken>` where required.

### Health
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Status + DB check |

### Auth (`/auth`)
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Create account (returns tokens) |
| POST | `/auth/login` | Login with `identifier` (email or phone) + password |
| POST | `/auth/otp/send` | Request phone verification code |
| POST | `/auth/otp/verify` | Verify phone |
| POST | `/auth/forgot-password` | Send reset code |
| POST | `/auth/reset-password` | Reset password with code |
| POST | `/auth/refresh` | Rotate refresh → access token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Current user profile |

### Catalogue
| Method | Path | Notes |
|---|---|---|
| GET | `/products` | List with filters: `category`, `brand`, `tag`, `gender`, `family`, `q`, `minPrice`, `maxPrice`, `sort` (`featured`/`newest`/ratings/price), `page`, `limit` |
| GET | `/products/:slug` | Single product |
| GET | `/brands` | Brand list |

### Shopping basket / wishlist
| Method | Path | Notes |
|---|---|---|
| PUT | `/cart` | Set cart items (structure: slugs + size labels + qty) |
| POST | `/cart/merge` | Merge guest cart into user cart after login |
| GET/POST | `/wishlist` | List / add wishlist items |
| POST | `/wishlist/merge` | Merge guest wishlist on login |
| DELETE | `/wishlist/:id` | Remove wishlist item |

### Orders & payments
| Method | Path | Notes |
|---|---|---|
| POST | `/orders` | Create order (items, zone, delivery method, promo, payment method) |
| GET | `/orders` | List my orders |
| GET | `/orders/:orderId` | Single order (tracking) |
| POST | `/payments/initiate` | Start payment (`orderId`, `method` `momo`/`card`, `phone`) |
| GET | `/payments/:txRef` | Payment status |
| POST | `/payments/:txRef/verify` | Verify payment |
| POST | `/payments/webhook` | Flutterwave webhook |
| GET/POST | `/payments/mock-checkout`, `/payments/mock-checkout/complete` | Console-mode simulated checkout |

### Experience features
| Method | Path | Notes |
|---|---|---|
| GET | `/blends` · POST `/blends` · DELETE `/blends/:id` | Save / load / delete custom blends |
| POST | `/bookings` | Book an in-store blending session |
| POST | `/scent-finder/recommend` | Scent quiz → product recommendations (`mood`, `season`, `notes`) |
| GET | `/reviews/product/:slug` · POST `/reviews/product/:slug` | Public reviews (posted ones are moderated) |
| GET | `/reviews/mine` | Current user's reviews |
| GET | `/loyalty` | Loyalty account (points, tier, balance) |

### Admin (admin role required)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/admin/products` · PATCH/DELETE `/admin/products/:id` | Manage products (price, stock, visibility in console) |
| GET/POST | `/admin/brands` | Manage brands |
| GET/PATCH | `/admin/orders` / `/admin/orders/:id` | Order status workflow |
| GET/PATCH | `/admin/bookings` / `/admin/bookings/:id` | Blending appointments |
| GET/PATCH | `/admin/reviews` / `/admin/reviews/:id` | Review moderation |

---

## Frontend reference

```
frontend/src/
├── App.js                  # Hash router, per-route title/scroll, applies URL filters
├── index.js                # React entry (no StrictMode)
├── index.css               # Full design system (original styles + React additions)
├── config.js               # API base URL (REACT_APP_API_BASE override)
├── api.js                  # Fetch wrapper: auth headers, refresh, guestId, JSON errors
├── store.js                # Global store — state, actions, persistence, API orchestration
├── i18n.js                 # en / rw / fr dictionaries + t() helper
├── data.js                 # Static seed data used before/while API catalogs load
├── utils.js                # money, stars, whatsapp links, brandName, image helpers
├── components/
│   ├── Layout.jsx          # PromoBanner, Header, MobileNav, CartDrawer, Footer, WA float, toast
│   ├── ProductCard.jsx     # Product card (badges, stock, add-to-cart, WhatsApp, wishlist)
│   ├── ProductImage.jsx    # Picture/img with deterministic placeholder + fallback
│   ├── Stars.jsx, SectionHead.jsx, Icons.jsx
└── pages/                  # Home, Shop, Product, Brands, Blends, Quiz, About, Visit,
                            # Faq, Checkout, OrderPage, Account, Admin, Static
```

### Core patterns
- **Store** — `state` is mutated by actions then `notify()` re-renders subscribers via `useStore()`. Everything (cart, wishlist, filters, quiz, auth, orders, blends) flows through `store.js`. Cart/wishlist/user persisted to `localStorage`.
- **Routing** — hash URLs: `#/`, `#/shop?cat=perfumes&brand=…&q=…`, `#/product/:slug`, `#/order/:code`, `#/page/:slug`. The `shop`/`product`/`brands` routes read query params each navigation and reset filters accordingly.
- **Images** — product/store photos use deterministic placeholder generators (picsum-based) via `realImg`/`ProductImage`; store photos & gallery are decorative gradient panels with `backgroundImage` (matching the original design). Real photos can be dropped in later without markup changes.
- **i18n** — every label goes through `t("key")`; all three languages ship in `i18n.js`.

---

## Website features

### Global chrome (`Layout`)
- Promo banner (announcements / offers)
- Sticky header: menu, **logo**, desktop nav, language switch (EN / Kinyarwanda / FR), **live search** (suggests matching products), wishlist shortcut, cart button with **live item-count badge**
- Mobile drawer nav + slide-in **cart drawer** (qty +/-, remove, subtotal, checkout CTA)
- Footer: brand blurb, shop/help links, socials, hours, address
- Floating **WhatsApp** button (direct chat) and toast notifications
- All panels auto-close on navigation

### Home
- Hero: headline, subtext, CTAs (shop / blends), animated bottle
- Trust strip (authentic, same-day delivery, custom blends, flexible payment)
- **Categories** grid (perfumes / attar & oils / jewelry)
- **Featured** (trending) and **New arrivals** product rows
- **Collections** (summer, gift sets, etc.)
- **Promo cards** (offer + code) and custom-blends teaser gallery
- Trust grid with icons, customer **testimonials**, **care articles**
- Newsletter band + promo-band signup

### Shop (`#/shop`)
- Category/collection landing pages by slug
- **Filter panel** — category chips, brand chips, price min/max + live range
- **Sorting** — recommended, price low→high / high→low, top rated, newest
- **Live search** from query param `q`
- Result count, empty state with reset
- Grid of product cards (stock pills, badges, prices, rating stars, quick-add, WhatsApp order, wishlist heart)

### Product page (`#/product/:slug`)
- **Gallery** — thumbnail switcher (rotates deterministic photos)
- Rating + review count, price per size, availability line
- **Size selector**, quantity stepper, **Add to cart**, **Buy on WhatsApp**, **wishlist toggle**, **share** (copies product link)
- **Back-in-stock notify** for out-of-stock items
- **Fragrance pyramid** — top / heart / base notes
- **Specs grid** — longevity, projection, season, gender, family (+ meters)
- **More from this brand** + **Complete the look** (opposite-category picks)
- **Reviews** — loaded from API, star-graded, post form (moderated), empty state

### Brands (`#/brands`)
- Brand grid — monogram mark, tagline, product count
- Brand profile + featured products

### Custom Blends (`#/blends`)
- **Blend builder** — pick base oil, up to **3 notes**, size, name → live **price calc**
- Bottle preview tinted by base oil
- **Popular combos** (one-click apply), **past-work gallery**
- **Save blend** to account (API), load/delete saved blends
- **Book a session** — in-store blending appointment form (date/time/phone/message)

### Scent Finder (`#/quiz`)
- 3-step quiz: **mood → season → notes** (≤ 3), single progress bar
- Results from the scent-finder API mapped to matching products + retake
- Validations (must pick a mood, at least one note, ≤ 3 notes)

### About / Visit / FAQ (`#/about`, `#/visit`, `#/faq`)
- About: story, values, steps, stats
- Visit: address, **Google Maps embed**, landmarks, “how to find us”, hours table, contact, socials, **delivery zones + fees**
- FAQ: collapsible Q&A with accordion animation

### Checkout (`#/checkout`)
- Order form: name, phone, email, delivery address + **zone** (auto fee)
- **Delivery method** — delivery (zone-priced) or free store pickup
- **Payment** — MoMo / Airtel Money / card / cash; promo code; **loyalty discount**
- Totals with fee/discount; order creation via API; console-mode → mock payment flow

### Track order (`#/order/:code`)
- Lookup by order code, payment status pills, **Pay again**, order summary

### Account (`#/account`)
- **Auth** — register, login (email or phone), **OTP phone verification**, forgot/reset password, auto cart/wishlist merge on login
- Tabs — **My orders**, **Wishlist**, **Saved blends**, **Rewards** (loyalty points), **Addresses**
- Registered customer flows (logout, profile)

### Admin back office (`#/admin`)
- Tabs — **Products / Orders / Promotions / Reviews / Reports**
- Products: live price edit (prompt), restock/sell-out toggle, hide/show, **bulk CSV price update**
- Orders: status workflow (Received → Confirmed → Out for delivery → Delivered)
- Promotions: enable/disable offers, add code+label
- Reviews: moderate (approve/hide)
- Reports: trends from orders & reviews

### Static pages
- `#/page/:slug` renders content pages from the PAGES map (fragrance care, returns, privacy, authenticity/about-certificates) via a prose layout.

---

## Business logic (shared between UI and API)

- **Delivery zones** — fee per Kigali zone; **free pickup** at the store; free-delivery promo over thresholds
- **Loyalty** — points earned on orders, redeemable as discount at checkout
- **Promo codes** — discount codes applied at checkout (seeded + admin-managed)
- **Moderation** — customer reviews are hidden until approved in admin
- **Payments** — `console` mode simulates the whole charge flow locally; `flutterwave` mode charges real MoMo/cards and verifies via webhook
- **SMS OTP** — `console` mode prints codes to the server log; real SMS via Africa's Talking when configured

---

## Scripts

| Where | Command | What it does |
|---|---|---|
| `backend` | `npm start` | Run API (`node src/index.js`) |
| `backend` | `npm run dev` | Run API with watch mode |
| `backend` | `npm run seed` | Seed catalogue, zones, loyalty rules, admin |
| `frontend` | `npm start` | Dev server on `:3000` (hot reload) |
| `frontend` | `npm run build` | Production build → `frontend/build/` |
| `frontend` | `npm test` | Run CRA test runner |
| root | `start-servers.ps1` | Start API + frontend, open browser |

---

## Production build

```bash
cd frontend
npm run build          # outputs optimized bundle in build/
```
Serve `build/` from any static host (Nginx, Vercel, Netlify…). The app uses hash routing, so no URL rewrite/SPA fallback configuration is required. Point the API at the real host via `REACT_APP_API_BASE` at build time and run the backend with `NODE_ENV=production`, a real `MONGODB_URI`, SMS/Flutterwave keys, and an HTTPS reverse proxy.

---

## Updating / extending the project

- **New product, brand, zone, promo, review or admin** → prefer the seeded admin dashboard; for bulk data edits, update `backend/scripts/seed.js` or the Mongo collections.
- **New page** → add a view in `frontend/src/pages/`, register the route + title in `frontend/src/App.js`.
- **New label** → add the key to **all three** languages in `frontend/src/i18n.js` (en / rw / fr).
- **New API endpoint** → add the route file under `backend/src/routes/`, wire it in `backend/src/app.js` (mounted under `/api/v1`), validate inputs with `zod`.
- **Copy changes** → `frontend/src/data.js` (static seed fallback) and `backend/scripts/seed.js` stay in sync on purpose.
- **Design tweaks** → all styles live in `frontend/src/index.css`; icons come from `react-icons` re-exported in `frontend/src/components/Icons.jsx`.

---

*README authoritative as of the **React + Express migration** commit. Update this file whenever flows or the data model change.*