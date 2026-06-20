# AssetSphere Pro

A full-stack IT Asset Management System built with React, Node.js, MongoDB, and Claude AI.

---

## Overview

AssetSphere Pro helps IT teams track hardware assets, manage user assignments, handle service requests, and get AI-powered troubleshooting guidance — all from a single web app.

**Live Demo**
- Frontend: Vercel deployment
- Backend: Render deployment

---

## Features

- **Asset Inventory** — Register, search, and manage all IT hardware with status tracking (available, assigned, maintenance, retired)
- **User Management** — Role-based accounts for admins, technicians, and users
- **Asset Assignments** — Assign assets to users with expected return dates and full history
- **Maintenance Requests** — Submit, assign, and resolve service requests with priority levels
- **Audit Trail** — Every maintenance update is logged with who changed what and when
- **Reports & Analytics** — Dashboard charts for asset status, category breakdown, and request trends
- **AI Troubleshooter** — Claude AI-powered chat for diagnosing IT issues with step-by-step fix guidance and automatic service request creation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Recharts, Axios |
| Backend | Node.js, Express 5, JWT, Bcryptjs |
| Database | MongoDB Atlas (Mongoose ODM) |
| AI | Claude Opus 4.8 via `@anthropic-ai/sdk` |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Project Structure

```
Asset-management-app/
├── backend/
│   ├── server.js
│   ├── config/          # DB connection, env validation
│   ├── middleware/      # Auth, role guard, security headers, rate limiter
│   ├── models/          # Mongoose schemas (6 collections)
│   ├── controllers/     # Business logic
│   ├── routes/          # Express routers + AI route
│   └── scripts/         # Database seed script
│
└── frontend/
    └── src/
        ├── App.jsx      # Route definitions
        ├── api.js       # Axios instance with JWT interceptor
        ├── pages/       # 10 pages
        ├── components/  # Shared components (Layout, Navbar, Sidebar, etc.)
        └── styles.css   # Global stylesheet
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Anthropic API key (optional — app works without it using local knowledge base)

### 1. Clone the repository

```bash
git clone https://github.com/kunal-dops/Asset-management-app.git
cd Asset-management-app
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/it_asset_management
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=8h
ALLOWED_ORIGINS=http://localhost:3000
ANTHROPIC_API_KEY=           # optional — enables Claude AI
```

Start the backend:

```bash
npm run dev      # development (nodemon)
npm start        # production
```

Seed sample data:

```bash
npm run db:seed
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm start
```

App runs at `http://localhost:3000`

---

## API Endpoints

### Auth
```
POST   /api/auth/login
```

### Users
```
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Assets
```
GET    /api/assets
POST   /api/assets
PUT    /api/assets/:id
DELETE /api/assets/:id
```

### Categories
```
GET    /api/categories
POST   /api/categories
DELETE /api/categories/:id
```

### Assignments
```
GET    /api/assignments
POST   /api/assignments
PUT    /api/assignments/return/:id
```

### Maintenance Requests
```
GET    /api/maintenance
POST   /api/maintenance
PUT    /api/maintenance/:id
PUT    /api/maintenance/:id/assign
GET    /api/maintenance/:id/audit
```

### AI Troubleshooter
```
POST   /api/ai/troubleshoot
```

---

## User Roles

| Permission | Admin | Technician | User |
|---|:---:|:---:|:---:|
| View assets & categories | ✅ | ✅ | ✅ |
| Add / edit / delete assets | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Create maintenance request | ✅ | ✅ | ✅ |
| Assign / resolve requests | ✅ | ✅ | ❌ |
| AI Troubleshooter | ✅ | ✅ | ✅ |

---

## AI Troubleshooter

The AI Troubleshooter works in two modes:

**Local mode** (no API key needed) — keyword-based knowledge base covers 6 common IT issue categories: power/hardware, network, printer, login/access, asset assignment, and software.

**Claude AI mode** (requires `ANTHROPIC_API_KEY`) — uses `claude-opus-4-8` with adaptive thinking to give context-aware diagnosis, step-by-step fix guidance, confidence scoring, and escalation paths.

Both modes return the same structured response so the UI works identically in either case. A "Claude AI" badge appears on each message when the API is active.

---

## Environment Variables

### Backend

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Signing secret (min 32 characters) |
| `JWT_EXPIRES_IN` | No | Token expiry (default: `8h`) |
| `ALLOWED_ORIGINS` | Yes | CORS-allowed frontend URL |
| `ANTHROPIC_API_KEY` | No | Enables Claude AI in the troubleshooter |
| `PORT` | No | Server port (default: `5000`) |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `REACT_APP_API_URL` | Yes | Backend API base URL |

---

## Deployment

### Backend → Render

1. Connect GitHub repo to Render
2. Set build command: `npm install`
3. Set start command: `node server.js`
4. Add all environment variables in the Render dashboard
5. Pushes to `main` auto-deploy

### Frontend → Vercel

1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Set `REACT_APP_API_URL` in Vercel environment variables
4. Pushes to `main` auto-deploy

---

## Database Collections

| Collection | Purpose |
|---|---|
| `users` | User accounts with roles |
| `categories` | Asset categories |
| `assets` | Hardware inventory |
| `asset_assignments` | Asset-to-user assignment records |
| `maintenance_requests` | Service desk tickets |
| `maintenance_audits` | Change history for every request |

---

## Security

- Passwords hashed with bcryptjs
- JWT authentication on all protected routes
- Role-based access control enforced server-side
- Rate limiting: 300 requests / 15 minutes per IP
- Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
- CORS restricted to configured origins
- Environment variables validated on server startup

---

## License

MIT
