<p align="center">
  <img src="public/nityantralogo.svg" alt="NitiYantra" width="80" />
</p>

<h1 align="center">NitiYantra</h1>
<p align="center"><strong>AI-Powered Governance Intelligence Platform</strong></p>
<p align="center"><em>Bridging policy to people.</em></p>

<p align="center">
  <a href="https://NitiYantra-orcin.vercel.app">🌐 Live Demo</a> · 
  <a href="https://nityantra-backend.onrender.com/docs">📡 API Docs</a> · 
  <a href="#demo-credentials">🔑 Login</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" />
  <img src="https://img.shields.io/badge/Gemini_AI-Powered-4285F4?logo=google" />
  <img src="https://img.shields.io/badge/Deployed-Vercel_%2B_Render-000?logo=vercel" />
</p>

---

## 🧠 What is NitiYantra?

NitiYantra is a **full-stack governance intelligence platform** that consolidates citizen complaints across Indian districts, classifies them using AI, detects SLA violations, and provides real-time analytics to administrators and politicians. It transforms fragmented civic data into a unified command center for proactive governance.

> **India Innovates 2026** — Built by **Bugged Bhature**, JSS University, Noida.

---

## ✨ Key Features

| Module | Description |
|---|---|
| **Command Center** | Real-time dashboard with live stats, department performance, and complaint feed |
| **Live Feed** | Chronological activity stream of all platform events |
| **Grievance Registry** | Full complaint management — submit, search, filter, paginate |
| **SLA Breach Monitor** | Flagged delayed issues with severity classification (Critical / Warning / Normal) |
| **AI Classifier** | Zero-shot complaint classification via BART-large-MNLI |
| **Pattern Analysis** | 3-stage AI pipeline — classify, cluster (MiniLM-L6-v2), and detect delays |
| **Performance Metrics** | Department-level analytics and resolution trend charts |
| **Geographic Monitor** | Full India heatmap with severity-colored markers (red/yellow/green) using Leaflet + GeoJSON |
| **Decision Extractor** | AI-powered meeting transcript analyzer (Gemini) |
| **Department Directory** | Directory of all monitored departments with contact info |
| **NitiBot** | AI chatbot (Gemini + rule engine) for platform Q&A |
| **Role-Based Access** | Session auth with distinct views for Admin, Minister, Dept Worker, Citizen |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 15)                   │
│  Vercel · App Router · Inter Typography · Ivory Theme       │
│  Leaflet Maps · React Hot Toast · CSS Variables             │
├─────────────────────────────────────────────────────────────┤
│                        REST API                             │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND (FastAPI)                         │
│  Render · SQLAlchemy · Pydantic · JWT Auth                  │
│  Gemini AI · HuggingFace Transformers                       │
├─────────────────────────────────────────────────────────────┤
│                   PostgreSQL (Render)                        │
│  Users · Complaints · Issues · Departments · Assignments    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: CSS Variables + Inline Styles (Soft Ivory `#FFFFF0` theme)
- **Typography**: Inter via Google Fonts
- **Maps**: Leaflet + React-Leaflet + GeoJSON masking
- **Auth**: JWT with `AuthContext` provider
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL via SQLAlchemy
- **AI Models**: BART-large-MNLI (classification), MiniLM-L6-v2 (clustering), Gemini (chatbot + meeting analysis)
- **Auth**: JWT with bcrypt password hashing
- **Deployment**: Render (Docker)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+

### Frontend

```bash
cd nityantra-frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd nityantra-backend
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost/NitiYantra"
export GEMINI_API_KEY="your-gemini-key"
export JWT_SECRET="your-secret"

uvicorn main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs (Swagger UI)
```

### Seed Database

```bash
python seed.py
# Or hit: GET /seed-database (browser-accessible endpoint)
```

---

## 🔑 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| **Admin** | `admin` | `admin123` |
| **Minister** | `minister_sharma` | `pass123` |
| **Department Worker** | `pwd_ravi` | `pass123` |
| **Citizen** | `citizen_rahul` | `pass123` |

---

## 📁 Project Structure

```
nityantra-frontend/
├── app/
│   ├── page.tsx              # Landing page (hero + AI demo)
│   ├── login/page.tsx        # Session-based auth gate
│   ├── dashboard/page.tsx    # Command Center
│   ├── activity/page.tsx     # Live Feed
│   ├── complaints/           # Grievance Registry + New Complaint
│   ├── issues/page.tsx       # SLA Breach Monitor
│   ├── ai-pipeline/page.tsx  # Pattern Analysis (3D cards)
│   ├── analytics/page.tsx    # Performance Metrics
│   ├── heatmap/page.tsx      # Geographic Monitor (India map)
│   ├── classifier/page.tsx   # AI Classifier
│   ├── meetings/page.tsx     # Decision Extractor
│   ├── departments/page.tsx  # Department Directory
│   └── settings/page.tsx     # User Settings
├── components/
│   ├── Sidebar.tsx           # Role-based nav with search
│   ├── LayoutShell.tsx       # Auth-gated layout wrapper
│   ├── ChatBot.tsx           # NitiBot (Gemini + rules)
│   └── Navbar.tsx            # Top action bar
├── lib/
│   ├── api.ts                # API client functions
│   ├── AuthContext.tsx        # JWT session management
│   └── SidebarContext.tsx     # Sidebar collapse state
└── public/
    ├── nityantralogo.svg      # Brand logo
    └── NitiYantra-hero.png      # Hero image

nityantra-backend/
├── main.py                   # FastAPI app (all routes)
├── database.py               # SQLAlchemy models + connection
├── seed.py                   # Database seeder (100+ users, 150+ complaints)
├── requirements.txt          # Python dependencies
└── Dockerfile                # Render deployment
```

---

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend** | [NitiYantra-orcin.vercel.app](https://NitiYantra-orcin.vercel.app) |
| **Backend API** | [nityantra-backend.onrender.com](https://nityantra-backend.onrender.com) |
| **API Docs** | [nityantra-backend.onrender.com/docs](https://nityantra-backend.onrender.com/docs) |

---

## 🤖 AI Pipeline

```
Complaints → [BART-large-MNLI] → Category + Confidence Score
                                      ↓
         → [MiniLM-L6-v2 Embeddings] → Semantic Clusters
                                      ↓
         → [SLA Engine] → Delayed Issues (7d warning, 15d critical)
```

- **Classification**: Zero-shot using `facebook/bart-large-mnli` — categorizes into Roads, Water Supply, Electricity, Sanitation, Public Safety
- **Clustering**: Sentence embeddings via `all-MiniLM-L6-v2` + cosine similarity grouping
- **Delay Detection**: SLA threshold engine flags issues unresolved beyond configurable deadlines

---

## 👥 Team — Bugged Bhature

| Name | Role |
|------|------|
| **Hitendra Dhapola** | Backend Developer + AI/ML |
| **Arya Bhrdwaj** | Frontend Developer + UI Designer |
| **Astha Yadav** | Frontend Developer |
| **Kartik Kumar** | Backend Assist |

<p align="center"><strong>JSS University, Noida — India Innovates 2026</strong></p>

---

<p align="center">
  Built with ❤️ for better governance.
</p>
