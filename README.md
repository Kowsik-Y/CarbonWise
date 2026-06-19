# 🌿 CarbonWise

> **Track less. Reduce more.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Firebase](https://img.shields.io/badge/Firebase-12.x-orange?logo=firebase)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![AI Prompt](https://img.shields.io/badge/AI%20Prompt-ANTI.GRAVITY-10b981)](./ANTI.GRAVITY)

CarbonWise is a premium, production-ready sustainability platform built with **Next.js 16**, **Firebase Authentication**, **Firestore**, and **Google Gemini AI**. It helps individuals calculate, understand, and actively reduce their carbon footprint through personalized AI coaching, gamified weekly challenges, interactive simulation, and real-time progress tracking.

---

## 📖 Problem Statement

Climate change demands immediate personal and collective action. Yet most individuals struggle to reduce their emissions because:

1. **Assessment Fatigue** — Traditional carbon calculators require hundreds of highly specific inputs, leading to high drop-off rates.
2. **Abstract Impact** — Footprint numbers like "12 tonnes of CO₂e" feel disconnected from daily decisions.
3. **Lack of Personalization** — Generic tips like "install solar panels" ignore rent limitations, geography, or vehicle availability.

**CarbonWise addresses these directly:**
- A **5-step lifestyle wizard** with smart bill-to-kWh estimation and natural language AI autocomplete.
- Abstract CO₂ numbers translated into tangibles — *"equivalent to planting 34 mature trees"* or *"1,200 km of avoided driving"*.
- A **context-aware Gemini AI coach** that parses the user's specific emissions profile and generates prioritized, personalized action plans.
- A **real-time slider simulator** so users can preview reductions before committing to a habit change.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧮 **AI Carbon Assessment** | 5-step wizard covering Transport, Energy, Food, Shopping & Waste. Natural language autocomplete via Gemini. |
| 🤖 **Smart AI Coach** | Chat interface powered by Gemini with message history, chip prompts, and full emissions context. |
| 📊 **Progress Dashboard** | Recharts Pie (category breakdown) + Line Chart (historical trends), sustainability score, and XP display. |
| 🎯 **Action Planner** | Prioritized goal list ranked by CO₂ reduction impact. AI-generated personalized recommendations. |
| 🌿 **Carbon Simulator** | Instant slider-based simulator. Commit simulated settings directly as personal goals. |
| 🏆 **Weekly AI Challenges** | Gemini-generated custom challenges tailored to user's top emission category. XP rewards on completion. |
| 🎖️ **Gamification** | Levels, XP points, achievement badges (Carbon Pioneer, Eco Warrior, Challenger). |
| 👤 **Profile & Settings** | Badge showcase, account management, and assessment reset. |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2.9 — App Router, Turbopack |
| **Runtime** | React 19.2.4 |
| **Language** | TypeScript 5.x (strict mode) |
| **Styling** | Tailwind CSS v4 — glassmorphism, micro-animations, radial dark themes |
| **Authentication** | Firebase Authentication (Email/Password) |
| **Database** | Firebase Firestore (primary) / Prisma + SQLite (fallback) |
| **AI** | Google Gemini API (`@google/generative-ai`) |
| **Session Security** | `jose` — HttpOnly cookie JWT signing + Firebase JWKS remote verification |
| **Charts** | Recharts v3 (SSR-safe dynamic imports) |
| **Animations** | Framer Motion + Canvas Confetti |
| **Forms** | React Hook Form + Zod validation |
| **Icons** | Lucide React |

---

## 📁 Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── auth/               # login · logout · session · signup
│   │   ├── carbon/             # assessment · parse-assessment (AI autocomplete)
│   │   ├── challenges/         # dynamic AI challenge generation
│   │   ├── chat/               # Gemini AI coach streaming
│   │   ├── coach/              # coach report endpoint
│   │   ├── dashboard/          # aggregated user stats
│   │   ├── goals/              # CRUD goals + AI recommendations
│   │   └── simulator/          # AI-suggested simulator plan
│   ├── assessment/             # 5-step carbon wizard
│   ├── auth/                   # Login / Sign-up page
│   ├── challenges/             # Weekly eco-challenges board
│   ├── coach/                  # AI chat interface
│   ├── dashboard/              # Analytics & stats
│   ├── goals/                  # Action planner & tracker
│   ├── profile/                # Levels, badges, settings
│   ├── simulator/              # Lifestyle change simulator
│   ├── globals.css             # Tailwind v4 + glass tokens
│   ├── layout.tsx              # Root layout, SEO metadata, AuthProvider
│   └── manifest.ts             # PWA manifest
├── components/
│   └── ui/                     # Button · GlassCard · Navigation · Dialog · Input
├── features/
│   └── auth/                   # AuthContext (Firebase onAuthStateChanged)
├── lib/
│   ├── db.ts                   # Prisma Client singleton (fallback)
│   └── firebase.ts             # Firebase App/Auth/Firestore init
├── services/
│   ├── ai-coach.ts             # Gemini coach engine + local heuristic fallback
│   ├── auth.ts                 # JWT sign/verify (HS256 + Firebase JWKS)
│   └── db-service.ts           # Dual-mode DB abstraction (Firestore / Prisma)
├── types/
│   └── index.ts                # Global TypeScript interfaces
└── utils/
    ├── carbon-calculator.ts    # EPA/IPCC emission factors & scoring
    └── challenges-list.ts      # Static challenge catalog
prisma/
└── schema.prisma               # Prisma schema (SQLite fallback)
public/
├── icon-192.png                # PWA icon
├── icon-512.png                # PWA icon
└── sw.js                       # Service Worker (offline support)
```

---

## 🔐 Security

See [`SECURITY.md`](./SECURITY.md) for the full vulnerability disclosure policy.

**Implemented security controls:**

- **Firebase Authentication** — industry-standard email/password auth with Google-managed token lifecycle.
- **JWKS Token Verification** — Server-side Firebase ID tokens verified against Google's public certificate endpoint (`securetoken.google.com`) using `jose`. No service account private key required.
- **HttpOnly JWT Session Cookies** — Session tokens stored in `HttpOnly`, `Secure`, `SameSite=Lax` cookies — never accessible to client-side JavaScript, preventing XSS token theft.
- **Zod Input Validation** — All API route inputs are parsed through strict Zod schemas at the boundary before any business logic executes.
- **Firestore Security Rules** — Data access enforced at the database layer via Firebase Security Rules.
- **Parameterized Queries** — Prisma ORM used for SQLite fallback mode; parameterized queries prevent SQL injection.
- **Password Hashing** — `bcryptjs` with 10 salt rounds for fallback credential mode.
- **No Secrets on Client** — All API keys, tokens, and secrets are server-only environment variables. Only `NEXT_PUBLIC_*` Firebase config values are exposed to the client.

---

## ♿ Accessibility (WCAG 2.1 AA)

- **Semantic HTML5** — `<header>`, `<main>`, `<footer>`, `<section>`, `<nav>` landmarks throughout.
- **Keyboard Navigation** — All interactive elements are fully keyboard accessible.
- **Focus Rings** — Visible glowing focus indicators on all focusable elements.
- **Labelled Controls** — All form fields use explicit `<label htmlFor="...">` associations.
- **Color Contrast** — White and brand-green text on deep carbon-black backgrounds exceed AA contrast ratios.
- **Reduced Motion** — Animations respect `prefers-reduced-motion` OS preference.
- **Screen Reader** — ARIA labels on icon-only buttons (e.g., logout).

---

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** v18.x or later
- **Firebase project** with Authentication (Email/Password) and Firestore enabled
- **Google Gemini API key** (optional — app works without it using local heuristics)

### Step 1: Clone & install

```bash
git clone https://github.com/your-org/carbonwise.git
cd carbonwise
npm install --legacy-peer-deps
```

### Step 2: Configure environment

Create a `.env` file at the root of the project:

```env
# ── Google Gemini AI ──────────────────────────────────────────────────────────
# Required for live AI coaching, autocomplete assessment, and dynamic challenges.
# Leave blank to use the local assessment-aware heuristic fallback.
GEMINI_API_KEY="your_gemini_api_key_here"

# ── Firebase (Auth + Firestore) ───────────────────────────────────────────────
# Copy these values from: Firebase Console → Project Settings → Your Apps → Web
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="000000000000"
NEXT_PUBLIC_FIREBASE_APP_ID="1:000000000000:web:abc123"

# ── Optional ──────────────────────────────────────────────────────────────────
# Set a custom domain for production OpenGraph/Twitter social card image URLs
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# JWT fallback secret (used only when Firebase is not configured)
JWT_SECRET="change_me_to_a_random_32_character_string"
```

### Step 3: Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → your project.
2. **Authentication** → Sign-in method → Enable **Email/Password**.
3. **Firestore Database** → Create database. Configure your Security Rules from the Firebase Console as needed (see [`SECURITY.md`](./SECURITY.md) for recommended production rules).

### Step 4: Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Gemini AI — coach, challenges, autocomplete |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `NEXT_PUBLIC_APP_URL` | No | Production base URL for SEO/OG image links |
| `JWT_SECRET` | No | HS256 JWT secret for fallback (non-Firebase) auth mode |
| `DATABASE_URL` | No | SQLite URL for Prisma fallback mode |

---

## 🚢 Deployment (Vercel)

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add all environment variables in **Vercel Dashboard → Project → Settings → Environment Variables**.
4. Deploy — Next.js, Firebase, and Gemini work out-of-the-box on Vercel's Edge runtime.

> **Database:** Firebase Firestore is the primary database and requires zero infrastructure. No PostgreSQL or migration commands needed for production.

---

## 🏗️ Architecture Overview

```
Browser (Client)
    │
    ├─ Firebase Auth SDK  ──► onAuthStateChanged ──► AuthContext (React)
    │                                                     │
    │                                                  ID Token
    │                                                     │
    └─ Next.js App Router ───────────────────────────────►│
            │                                             │
            ├─ /api/auth/*     ◄── verifyToken (jose JWKS / HS256)
            ├─ /api/dashboard  ◄── db-service.ts
            ├─ /api/goals/*    ◄── db-service.ts + Gemini AI
            ├─ /api/challenges ◄── db-service.ts + Gemini AI
            ├─ /api/chat       ◄── ai-coach.ts (Gemini SDK)
            └─ /api/carbon/*   ◄── db-service.ts + Gemini AI
                                        │
                              ┌─────────┴─────────┐
                              │                   │
                        Firestore             Prisma/SQLite
                        (primary)             (fallback)
```

The `db-service.ts` layer automatically routes all database operations to **Firestore** when Firebase environment variables are present, or falls back to **Prisma/SQLite** when they are absent — zero code changes needed.

---

## 🧪 Testing

```bash
# Run unit tests (Vitest)
npx vitest run

# Run with coverage report
npx vitest run --coverage
```

Tests cover: carbon calculation math, CO₂ equivalence helpers, and JWT validation utilities.

---

## 📈 Performance

- **Turbopack** for sub-100ms local rebuilds.
- **Dynamic imports** for Recharts and Canvas Confetti to avoid SSR crashes.
- **Static pre-rendering** — all pages pre-render at build time; API routes are dynamic-on-demand only.
- **Service Worker** — offline-capable PWA with `public/sw.js`.
- **Optimized icons** — 192px and 512px PWA icons in `public/`.

---

## 🔮 Future Improvements

1. **OCR Bill Scanning** — AI-powered electricity bill parsing to auto-fill kWh fields.
2. **Smart Home Integration** — Nest, Ecobee, and EV charger data connectors.
3. **Social Leaderboards** — Friend groups competing on weekly emissions reductions.
4. **Carbon Offset Marketplace** — In-app tree planting and offset certificate purchasing.
5. **Public Developer API** — REST endpoints for third-party ecommerce carbon checkout widgets.
6. **Playwright E2E Tests** — Full browser automation test suite.

---

## 🤖 AI Prompt

This project was designed and built using a structured AI engineering prompt.
The full brief — including architecture requirements, security controls, accessibility targets, feature specifications, and key implementation notes — is available in:

📄 **[`ANTI.GRAVITY`](./ANTI.GRAVITY)**

The prompt was used to guide development of the entire application: from database schema and API design to UI components, Gemini AI integration, and dual-mode Firestore/Prisma database abstraction.

---

## 📄 License

This project is licensed under the **MIT License** — see [`LICENSE`](./LICENSE) for details.

---

## 🙌 Acknowledgements

- [Google Gemini AI](https://ai.google.dev) — powering the sustainability coach and dynamic challenge generation.
- [Firebase](https://firebase.google.com) — authentication and real-time database.
- [Recharts](https://recharts.org) — interactive data visualization.
- [Lucide React](https://lucide.dev) — icon system.
- [Tailwind CSS](https://tailwindcss.com) — utility-first styling.
