<div align="center">

# ⚡ ScreenAI
### Production-Ready AI-Powered Automated Resume Screening & Talent Matching Platform

[![Next.js](https://img.shields.io/badge/Next.js-16%2B-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.0_Flash-8E75B2?style=flat-square&logo=google)](https://ai.google.dev/)

<p align="center">
  A high-throughput talent intelligence SaaS platform that parses, evaluates, and ranks candidate resumes against specific role requirements with automated multi-tier fallback pipelines.
</p>

[Key Features](#-key-features) • [Preview](#-preview) • [Architecture](#-system-architecture) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Database Schema](#-database-schema)

</div>

---

## 📌 Problem & Solution

Reviewing hundreds of technical resumes per opening creates a significant bottleneck for engineering hiring teams. Many standard applicant tracking systems rely on naive keyword matching that misses strong candidates or lets unqualified ones slip through.

**ScreenAI** solves this by leveraging structured LLM evaluation pipelines:
- Analyzes candidate experience against nuanced engineering requirements.
- Mitigates API rate-limits and high-demand spikes using an in-memory concurrency queue and fallback models.
- Persists candidates and multi-stage screening criteria in a relational PostgreSQL schema.

---

## ✨ Key Features

* **Multi-Resume Batch Ingestion:** Drag-and-drop or upload multiple PDF resumes simultaneously.
* **Controlled Concurrency Queue:** In-memory queue worker throttling requests to prevent `429 Rate Limit` and `503 Unavailable` Google API errors.
* **Model Fallback Chain:** Automatic degradation with exponential backoff (`gemini-2.0-flash` $\rightarrow$ `gemini-1.5-flash`) ensuring zero interrupted batches.
* **Comprehensive Tech Skills Autocomplete:** 250+ predefined industry tech stacks with alias matching (`k8s` $\rightarrow$ `Kubernetes`, `js` $\rightarrow$ `JavaScript`) and free-form tagging.
* **Dynamic Candidate Dashboard:** Real-time analytics, match scoring (0–100), automated recommendation bands (`Strong Match`, `Potential Match`, `Not a Fit`), and candidate deep dives.
* **Relational Persistence:** Fully managed schema supporting multi-session HR workflows backed by Supabase PostgreSQL and Prisma ORM.

---

## 🖼 Preview

<div align="center">
  <img src="./public/screenshots/dashboard.png" alt="ScreenAI Dashboard" width="100%" style="border-radius: 8px;" />
</div>

---

## 🏗 System Architecture

```text
[HR Uploads Resumes]
         │
         ▼
[Next.js App Router API (/api/analyze)]
         │
         ├──► [In-Memory Queue (Concurrency: 2, Throttling: 500ms)]
         │           │
         │           ▼
         ├──► [Gemini 2.0 Flash] ──(On 429/503)──► [Retry / Fallback to Gemini 1.5]
         │           │
         │           ▼
         ├──► [Structured JSON Extraction & Zod Validation]
         │           │
         │           ▼
         └──► [Prisma Client] ──► [Supabase PostgreSQL DB]
                     │
                     ▼
       [Live Dashboard React UI / Query Cache]
```

---

## 🛠 Tech Stack

* **Frontend:** Next.js 16 (App Router, Turbopack), React, TypeScript, Tailwind CSS, Lucide Icons
* **Backend:** Next.js Route Handlers, Node.js PDF parsing
* **Database & ORM:** PostgreSQL (Supabase), Prisma ORM
* **AI Engine:** Google Gemini Flash API via `@google/genai`
* **State & Data Fetching:** TanStack React Query, Zustand

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18.x or later
* npm (recommended) or pnpm
* Supabase PostgreSQL database
* Google AI Studio API Key

### Installation

1. **Clone repository:**
   ```bash
   git clone https://github.com/temurprogram77/screen-ai.git
   cd screen-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # Google Gemini API
   GEMINI_API_KEY="your-gemini-api-key"

   # Supabase Database (Prisma)
   DATABASE_URL="postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
   ```

4. **Initialize Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗄 Database Schema

* **`JobOpening`**: Represents an active recruitment pipeline, storing title, seniority, required competencies, and must-have constraints.
* **`Candidate`**: Stores parsed resume metadata, experience duration, match score, detailed strengths, potential red flags, AI-generated interview questions, and pipeline evaluation status (`PENDING`, `SHORTLISTED`, `REJECTED`).

---

## 📄 License

This project is licensed under the MIT License.
