# FoodBridge — AI-Powered Food Waste Reduction and Redistribution Platform

> **Rescue Food. Restore Hope.**  
> *College Hackathon Prototype — Problem Statement BONUS01*

FoodBridge is an intelligent, full-stack food waste reduction platform designed to seamlessly connect food providers (restaurants, hotels, college canteens, hostels, caterers) with verified recipients (NGOs, charities, homeless shelters, community kitchens) in real-time.

---

## 🌟 Key Features

1. **5-Factor Intelligent Matching Engine**:
   - 30% Urgency (Food expiry countdown & freshness window)
   - 25% Distance (Haversine geodesic proximity)
   - 20% Recipient Intake Capacity (Matching batch volume to beneficiaries)
   - 15% Availability (Volunteer & vehicle pickup response)
   - 10% Handling & Storage Compatibility (Refrigeration, warm transit, allergen flags)

2. **Role-Based Workflows**:
   - **Food Provider**: Rapid surplus food listing, expiry timers, recipient recommendations, dispatch confirmation.
   - **NGO / Recipient**: Trust verification, capacity specification, real-time alert feed, pickup scheduling.
   - **Administrator**: Organization vetting, food safety moderation, matching weight adjustments, analytics.

3. **Food Safety & Quality Assurance**:
   - Automated preparation timestamp logging and expiry countdowns.
   - Expired or flagged listings are quarantined from matching.
   - Safe food handling checklists and temperature specifications.

4. **FoodBridge AI Assistant**:
   - Powered by Google Gemini with an offline rule-based fallback.
   - Natural language surplus food listing generator, matching explanations, and donation status tracking.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v3, Framer Motion, React Router v7, Axios, Lucide React, Recharts, Leaflet.
- **Backend**: Node.js, Express, TypeScript, Mongoose, MongoDB (with automatic in-memory fallback for zero-config demonstration), Zod validation, bcryptjs, JWT.
- **AI**: Google Gemini API with modular fallback engine.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended; tested on v26)
- npm

### 1. Installation
The project uses separate client and server packages, with a root orchestrator.
```bash
# Clone or open the project folder
cd e:\Techtrix

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Running Locally (Concurrent)
From the root directory:
```bash
npm run dev
```
This runs both:
- **Client (Vite)**: `http://localhost:5173`
- **Backend API (Express)**: `http://localhost:5000`

### 3. Verification & Health Check
Visit `http://localhost:5000/api/health` in your browser or curl:
```bash
curl http://localhost:5000/api/health
```

---

## 🗺️ Project Structure

```
foodbridge/
  client/                   # React + TypeScript + Vite frontend
    src/
      components/           # Navbar, Footer, Status Badges
      pages/                # LandingPage, Auth, Dashboards
      services/             # Axios API client & endpoints
      index.css             # Tailwind design system & utilities
      App.tsx               # Route mapping
      main.tsx
  server/                   # Express + TypeScript backend
    src/
      config/               # Database connection (Mongoose + in-memory fallback)
      controllers/          # Route handlers
      models/               # Mongoose schemas
      routes/               # REST API endpoints
      services/             # AI, matching engine, notifications
      index.ts              # Server bootstrap & health check
    .env                    # Environment config
  README.md
  .gitignore
  .env.example
```

---

## 📌 Implementation Roadmap

- [x] **Phase 1: Project Setup & Foundation**
  - Scaffold React + Vite + Tailwind CSS frontend.
  - Setup Node.js + Express + TypeScript backend.
  - Resilient MongoDB connection with automatic in-memory fallback.
  - Landing page with live API health diagnostics and brand theme.
- [x] **Phase 2: Core Functionality**
  - User & Organization Mongoose models with GeoJSON 2dsphere indexing.
  - Full JWT authentication & role-based middleware (`provider`, `ngo`, `admin`).
  - 1-Click fast persona logins for instant hackathon demonstration.
  - Surplus food listing creation with preparation time & collection deadline validation.
  - Automated 5-factor weighted matching algorithm (30% Urgency, 25% Distance, 20% Capacity, 15% Availability, 10% Compatibility).
  - NGO request submission, provider approval, and capacity reservation.
  - Complete donation lifecycle state machine with 4-digit OTP handover validation.
  - Provider, NGO, and Admin interactive dashboards.
- [x] **Phase 3: Advanced Features**
  - FoodBridge AI floating chatbot with Gemini & intelligent rule-based fallback.
  - Natural language surplus food listing generator with 1-click form pre-filling.
  - Interactive Leaflet & OpenStreetMap geolocation mapping with customized SVG pins and 15km service radius circles.
  - NGO Directory with search, city filtering, and map/list view toggle.
  - Recharts Social Impact & UNEP-aligned Carbon Offset Analytics (`/analytics`).
  - Notifications center with real-time match alerts and expiry warnings (`/notifications`).
  - About & How It Works platform process walkthrough (`/about`).
- [x] **Phase 4: UI Polish, Micro-Animations & Accessibility**
  - Framer Motion page transitions (`<PageTransition>`, `<AnimatePresence>`) and scroll-to-top route reset.
  - Interactive Toast notification system (`ToastContext`) with accessible auto-dismiss alerts.
  - Shimmering card, stat, table, and detail page skeleton loaders (`SkeletonLoader.tsx`).
  - Interactive urgency visual badges with live countdowns for batches expiring under 2 hours.
  - Full mobile responsiveness with animated hamburger navigation drawer and responsive tables.
  - Accessible ARIA labels, focus rings, role attributes, and semantic HTML5 landmarks.
  - Click-to-copy OTP code buttons with instant toast feedback.
- [x] **Phase 5: Automated Testing & Production Build Verification**
  - 57-assertion automated integration test suite (`npm test`) covering:
    1. Dynamic user registration for both Providers & NGOs with capacity parameters.
    2. Dynamic and demo persona authentication (Provider, NGO, Admin) and password security.
    3. Server-side role authorization enforcement (RBAC) & unauthenticated request blocking.
    4. Automated food safety rules and past collection deadline rejection.
    5. Surplus food listing creation with 4-digit pickup and delivery OTP generation.
    6. 5-Factor weighted recommendation engine (30% Urgency, 25% Distance, 20% Capacity, 15% Availability, 10% Compatibility).
    7. NGO collection requests, duplicate request blocking, and provider approval workflow.
    8. Driver handover validation with cryptographic 4-digit pickup OTP verification.
    9. Recipient shelter confirmation with 4-digit delivery OTP verification.
    10. Complete database persistence and query integrity across audit timeline events and platform impact analytics.
    11. FoodBridge AI natural language assistant with structured food draft extraction.
  - 100% test pass rate (57 passed, 0 failed).
  - Clean production builds for both client (`npm run build:client`) and server (`npm run build:server`) with zero TypeScript or Vite errors.
