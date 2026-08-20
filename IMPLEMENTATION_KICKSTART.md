# Implementation Kickstart — Pretty and Blingedd

Single-page booking site. Check items off as they ship.

## 1. Project scaffold

- [x] Create Astro + Tailwind project (`pretty-and-blingedd`)
- [x] Add `package.json` scripts: `dev`, `build`, `preview`
- [x] Configure Tailwind v4 via `@tailwindcss/vite`
- [x] Add brand tokens (lip / blush / cream / ink) from the logo
- [x] Load Manrope (body) + Playfair Display italic (hero)
- [x] Add `.gitignore`, `.env.example`, `astro.config.mjs`
- [x] Copy logo and export WebP (`public/images/logo.webp` + favicon)

## 2. Shared UI (one CTA, one modal)

- [x] `BookButton` — identical bubblegum style; default copy **Book Your Session**
- [x] Native `<dialog>` booking modal (iframe from `PUBLIC_BOOKING_URL`)
- [x] Empty-URL fallback: “booking coming soon” + click-to-call
- [x] All book buttons open the same modal (no extra routes)
- [x] `tel:+18058434728` for every phone instance

## 3. Page sections (in order)

- [x] **Hero** — headline, subhead, CTA, trust row; fits first mobile screen
- [x] Trust row copy: Certified Dental Assistant · Home-Based · Mobile Available · Ventura County
- [x] **Sticky mobile CTA bar** — Call Now + Book Your Session →
- [x] **Benefits** — 4 cards + repeat CTA
- [x] **Gallery** — before/after placeholder grid (WebP, lazy-load)
- [x] **Testimonials** — 3 placeholder cards + repeat CTA
- [x] **FAQ** — 8 `<details>` items, collapsed by default
- [x] FAQ closer: **Still have questions? Book a Free Consult →**
- [x] **Footer (Option A)** — logo, tagline, area, phone, Instagram, CTA, © 2026 Pretty and Blingedd

## 4. Conversion + a11y polish

- [x] No header nav / extra pages / distracting links
- [x] Semantic landmarks + heading order
- [x] Accessible contrast on CTAs and body text
- [x] Alt-text placeholders on all images
- [x] Hero logo eager / high priority; below-fold images `loading="lazy"`
- [x] Subtle shimmer/glow on CTA hover + section sparkle dividers
- [x] Body padding so the sticky bar never covers content
- [x] Hide sticky bar while the booking modal is open

## 5. Verify

- [x] `npm run build` succeeds (static output, Vercel-ready)
- [x] Only one route: `/`

## Drop in later (no redesign)

- [ ] Paste Calendly or Setmore embed URL into `.env` as `PUBLIC_BOOKING_URL`
- [ ] Paste Instagram URL into `.env` as `PUBLIC_INSTAGRAM_URL`
- [ ] Replace `public/images/gallery-*.webp` with real before/after photos
- [ ] Swap placeholder FAQ answers and testimonial quotes
