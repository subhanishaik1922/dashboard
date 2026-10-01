# ⚡ Career Command Center

> A Principal Engineer-grade Personal CMS Dashboard & Public Portfolio Web Application featuring native professional network integrations for **Vercel REST API**, **LinkedIn**, and **Naukri FastForward**, protected by an **environment-backed authentication layer**.

---

## 🔒 Security & Route Protection Architecture

- **Protected Admin Path (`/admin`)**: Any unauthenticated direct visit or navigation to `/admin` automatically triggers an HTTP 302 redirect / client route redirect to `/login`.
- **Dedicated Secure Login Screen (`/login`)**: A centered, executive-tier login interface requiring the server's master `ADMIN_PASSWORD`.
- **Environment Password Ingestion**: `ADMIN_PASSWORD` is loaded directly from `.env` on the server and compared using timing-safe buffer matching (`crypto.timingSafeEqual`).
- **Full API Mutation Lockdown**: All modification endpoints across identity, resume, GitHub repositories, Vercel API hub tokens, LinkedIn metrics, and Naukri metrics require an active `Authorization: Bearer <token>`. Unauthorized requests receive HTTP 401.
- **Session Management**: Supported through both cryptographically secure Bearer tokens and HttpOnly session cookies for transparent server and browser navigation.

---

## 🚀 Key Architectural Highlights

### 1. Vercel API Hub
- **Secure Token Ingestion**: Express backend accepts and stores Vercel Personal Access Tokens with token masking (`vercel_pat_****abcd`).
- **REST API Integration**: Direct queries to `https://api.vercel.com/v6/deployments` to fetch active projects, commit SHAs, git branches, and live deployment domains.
- **Normalized Status Pipeline**: Maps raw Vercel states to standard `Ready`, `Building`, `Error`, and `Queued` states with real-time UI beacons.
- **Dual-View Visibility**: Deployment status pills and live URLs are rendered across both the **Public Portfolio Cards** and the **Admin Dashboard Logs**.

### 2. Job Board & Network Sync (LinkedIn & Naukri)
- **LinkedIn Metric Tracker**: Private admin controls for Profile Views, Search Appearances, In-Flight Applications, and InMail Inquiries with quick `+1` / `+5` steppers.
- **Naukri FastForward Tracker**: Dedicated metric logging for Naukri Profile Views, Keyword Searches, Applications, and Recruiter Actions.
- **High-Visibility Action Badges**: High-converting, brand-authentic action badges on the public view deep-linking directly to LinkedIn and Naukri profiles with real-time counters and status indicators.
- **Job Pipeline Tracker**: Full-featured Kanban/Table application tracker for logging target companies, roles, stages, and recruiter notes.

### 3. Enhanced Admin UI (Multi-Tab Layout)
- **Tab 1: Identity & Resume CMS**: Direct controls for full name, role title, email, phone, location, availability badge, short pitch, extended bio, resume link, and work experience CRUD.
- **Tab 2: Code & Hosting**: Side-by-side view pairing GitHub repository visibility toggles with live Vercel deployment status logs and simulation triggers.
- **Tab 3: Job Hunting**: Aggregated KPI tiles, LinkedIn & Naukri metric steppers, and the job application pipeline.

### 4. Local Database Persistence (`data/data.json`)
- Scaled JSON database structure covering `identity`, `vercel`, `github`, and `jobHunt`.
- Built-in atomic write mechanism (`.tmp` write followed by atomic rename) preventing data corruption during server reloads.
- Instant persistence for every update across server restarts.

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v24.19.0)
- **npm** v9+

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` and configure your admin credentials:
```env
PORT=3000
ADMIN_PASSWORD=admin123
VERCEL_TOKEN=
```

### 4. Start the Server
```bash
npm start
# or node server.js
```

### 5. Access the Application
- **Public Portfolio**: [http://localhost:3000](http://localhost:3000)
- **Protected Admin Route**: [http://localhost:3000/admin](http://localhost:3000/admin) *(Redirects to `/login` if unauthenticated)*
- **Login Screen**: [http://localhost:3000/login](http://localhost:3000/login) *(Default password: `admin123`)*
- **System Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🧪 Running Security & System Tests

```bash
# Unit & Persistence Tests
node test/verify.js

# Auth Logic & Timing-Safe Tests
node test/verify_auth.js

# Live End-to-End HTTP Security Tests
node test/e2e_http_test.js
```
