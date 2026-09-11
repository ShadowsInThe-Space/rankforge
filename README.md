# RankForge

> **English TL;DR:** Self-hosted SEO & GEO (Generative Engine Optimization) analysis platform — modular analyzer engine, AI-generated recommendations, PDF reporting. Next.js 16, Prisma/PostgreSQL, d3.

**Self-hosted SEO- & GEO-Analyse-Plattform** — Next.js 16 (App Router), Prisma/PostgreSQL, modulare Analyzer-Engine und KI-gestützte Empfehlungen. Analysiert Websites nicht nur auf klassisches SEO, sondern auch auf **GEO-Signale** (Generative Engine Optimization: wie gut Inhalte für KI-Antwortsysteme lesbar sind).

## Features

### 🔍 Analyzer-Engine (`src/lib/analyzers/`)
Modulares Scoring-System, jeder Analyzer liefert Befunde + Score-Beiträge:
- **Advanced SEO** — technische Meta-, Struktur- und Performance-Signale
- **Content** — Inhaltsqualität und Themenabdeckung
- **Links / Link-Tier** — interne Verlinkung und Hierarchie-Bewertung
- **Index-Tier** — Indexierbarkeit und Crawl-Zugänglichkeit
- **Date-Consistency** — Datums-Konsistenz als Trust-Signal
- **GEO-Signals** — Vorbereitung auf KI-Suchsysteme (Generative Engine Optimization)

### 🤖 KI-Empfehlungen
Aus den Analyzer-Ergebnissen generierte, priorisierte Handlungsempfehlungen (`src/lib/ai/recommendations.ts`).

### 📄 Reporting
Druckfertige **PDF-Reports** via `@react-pdf/renderer`, Datenvisualisierung mit **d3**.

### 👥 Multi-User
Auth mit Register/Login (bcrypt), Rollen, Admin-Bereich, Upgrade-Flow.

## Tech-Stack

| Layer | Technologie |
|---|---|
| Framework | Next.js 16, React 19, App Router |
| Datenbank | PostgreSQL via Prisma (Migrations inklusive) |
| UI | Tailwind CSS, d3 |
| Reports | @react-pdf/renderer |
| Tests | Vitest + Testing Library (`src/__tests__/`) |

## Setup

```bash
npm install
cp .env.example .env   # DATABASE_URL auf eine Postgres-Instanz zeigen lassen
npx prisma migrate deploy
npm run dev
```

## Status

Aktiv entwickeltes Inhouse-Tool; wird u. a. von der Mission-Control-Plattform per API angesprochen (`/api/seo/scrape`).
