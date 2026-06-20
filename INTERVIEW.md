# AssetSphere Pro — Interview Reference Guide

> A full-stack IT Asset Management System built with React, Node.js/Express, MongoDB, and Claude AI.

---

## 1. Project Summary

**AssetSphere Pro** is an internal IT asset management web application designed for organizations to track hardware assets, manage user assignments, handle service/maintenance requests, and get AI-powered troubleshooting guidance.

| Attribute | Detail |
|---|---|
| Type | Full-stack MERN web application |
| Users | IT admins, technicians, end users |
| Auth | JWT-based, role-protected routes |
| Database | MongoDB Atlas (cloud) |
| AI | Claude Opus 4.8 (Anthropic) with local fallback |
| Deployment | Frontend → Vercel, Backend → Render |

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| React Router | v6 | Client-side routing |
| Axios | 1.7 | HTTP client with JWT interceptor |
| Recharts | 2.12 | Dashboard charts & analytics |
| React Icons | 5.2 | Icon library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | LTS | Runtime |
| Express | 5.2 | Web framework |
| Mongoose | 8.24 | MongoDB ODM |
| JWT | 9.0 | Stateless authentication |
| Bcryptjs | 3.0 | Password hashing |
| @anthropic-ai/sdk | latest | Claude AI integration |

### Infrastructure
| Service | Role |
|---|---|
| MongoDB Atlas | Cloud database (cluster0.ptkuzzx.mongodb.net) |
| Render | Backend hosting (Node.js web service) |
| Vercel | Frontend hosting (static React build) |
| GitHub | Source control, CI/CD trigger |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│                                                          │
│  React 18 SPA — Vercel CDN                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Dashboard │ │ Assets   │ │ Users    │ │AIAgent   │  │
│  │Reports   │ │Categories│ │Maintenance│ │Settings  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│        │  Axios + JWT Bearer token                       │
└────────┼────────────────────────────────────────────────┘
         │ HTTPS
┌────────▼────────────────────────────────────────────────┐
│                 BACKEND (Render)                         │
│                                                          │
│  Express 5 REST API                                      │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │ Middleware Stack (in order)             │            │
│  │  securityHeaders → requestContext →    │            │
│  │  requestLogger → rateLimiter → CORS →  │            │
│  │  bodyParser → authMiddleware           │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │/api/auth │ │/api/users│ │/api/asset│ │/api/ai   │  │
│  │/api/cat  │ │/api/maint│ │/api/assig│ │          │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│        │                                     │           │
│        │                               ┌─────▼─────┐    │
│        │                               │ Claude API │    │
│        │                               │ (Anthropic)│    │
│        │                               └─────┬─────┘    │
└────────┼─────────────────────────────────────┼──────────┘
         │ Mongoose ODM                         │
┌────────▼─────────────────────────────────────┘
│              MongoDB Atlas (Cloud)                       │
│                                                          │
│  Collections:                                            │
│  users │ categories │ assets                             │
│  asset_assignments │ maintenance_requests                │
│  maintenance_audits                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Folder Structure

```
Asset-management-app/
├── backend/
│   ├── server.js              ← Express app entry point
│   ├── package.json
│   ├── .env                   ← MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY
│   ├── config/
│   │   ├── db.js              ← connectDB() — Mongoose connection
│   │   └── env.js             ← Validates required env vars on startup
│   ├── middleware/
│   │   ├── authMiddleware.js  ← JWT verification → req.user
│   │   ├── roleMiddleware.js  ← requireRole(admin, technician) factory
│   │   └── securityMiddleware.js ← Headers, rate limiter, request logger
│   ├── models/
│   │   ├── User.js
│   │   ├── Asset.js
│   │   ├── Category.js
│   │   ├── AssetAssignment.js
│   │   ├── MaintenanceRequest.js
│   │   └── MaintenanceAudit.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── assetController.js
│   │   ├── categoryController.js
│   │   ├── assignmentController.js
│   │   └── maintenanceController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── assetRoutes.js
│   │   ├── categoryRoutes.js
│   │   ├── assignmentRoutes.js
│   │   ├── maintenanceRoutes.js
│   │   └── aiRoutes.js        ← Claude AI + local KB
│   └── scripts/
│       └── seedDatabase.js    ← Seeds sample data
│
└── frontend/
    └── src/
        ├── App.jsx             ← React Router v6 route definitions
        ├── api.js              ← Axios instance + JWT interceptor
        ├── styles.css          ← Global CSS (single stylesheet)
        ├── index.js            ← ReactDOM entry point
        ├── pages/
        │   ├── Login.js
        │   ├── Dashboard.jsx
        │   ├── Assets.js
        │   ├── Users.jsx
        │   ├── Categories.jsx
        │   ├── Assignments.jsx
        │   ├── Maintenance.js
        │   ├── Reports.jsx
        │   ├── Settings.jsx
        │   └── AIAgent.jsx     ← AI Troubleshooter chatbot
        └── components/
            ├── Layout.jsx
            ├── Navbar.js
            ├── Sidebar.js
            ├── ProtectedRoute.js
            ├── ErrorBoundary.jsx
            ├── PageHeader.js
            └── AIFloatingButton.jsx
```

---

## 5. Database Design (MongoDB)

The app uses **6 collections** in MongoDB Atlas with Mongoose schemas.

### users
```js
{
  full_name: String (required),
  email:     String (required, unique),
  password:  String (required, bcrypt hashed),
  role:      Enum['admin', 'technician', 'user'] (default: 'user'),
  department: String,
  phone:      String,
  createdAt, updatedAt  // timestamps
}
```

### categories
```js
{
  category_name: String (required, unique),
  description:   String,
  createdAt      // timestamps
}
```

### assets
```js
{
  asset_name:    String (required),
  asset_tag:     String (required, unique),  // e.g. "asset_01"
  serial_number: String (sparse unique),
  category_id:   ObjectId → categories (required),
  brand, model, purchase_date, purchase_cost, vendor,
  warranty_expiry: Date,
  status: Enum['available', 'assigned', 'maintenance', 'retired'],
  location, description,
  createdAt, updatedAt
}
```

### asset_assignments
```js
{
  asset_id:            ObjectId → assets (required),
  user_id:             ObjectId → users (required),
  assigned_date:       Date (required),
  expected_return_date: Date,
  actual_return_date:  Date,
  assignment_status:   Enum['assigned', 'returned'],
  remarks: String,
  createdAt
}
```

### maintenance_requests
```js
{
  asset_id:          ObjectId → assets (required),
  reported_by:       ObjectId → users (required),
  issue_description: String (required),
  request_date:      Date,
  status:            Enum['pending', 'in_progress', 'resolved'],
  priority:          Enum['normal', 'urgent'],
  request_type:      String,  // Hardware/Software/Network/etc
  technician_id:     ObjectId → users,
  resolution_notes:  String,
  location, department, sublocation,
  assigned_by, checked_by, last_edited_by: ObjectId → users,
  createdAt, updatedAt
}
```

### maintenance_audits
```js
{
  request_id:  ObjectId → maintenance_requests (required),
  action:      String,    // 'created' | 'assigned' | 'resolved' | 'updated'
  edited_by:   ObjectId → users,
  edited_role: String,
  changes_json: String,   // JSON diff of what changed
  notes:        String,
  createdAt
}
```

> **Why an audit collection?** Every update to a maintenance request writes an audit document. This creates a full change history — who resolved it, who reassigned it, what notes were added — which is important for compliance and accountability in IT asset management.

---

## 6. API Design

### Authentication
```
POST   /api/auth/login          → { token, user } (public)
```

### Users (admin only for write)
```
GET    /api/users               → list all users
POST   /api/users               → create user
PUT    /api/users/:id           → update user
DELETE /api/users/:id           → delete user
```

### Assets
```
GET    /api/assets              → list all (populated with category name)
POST   /api/assets              → create asset
PUT    /api/assets/:id          → update
DELETE /api/assets/:id          → delete
```

### Categories
```
GET    /api/categories          → list all
POST   /api/categories          → create
DELETE /api/categories/:id      → delete
```

### Assignments
```
GET    /api/assignments         → list all (populated: asset name, user name)
POST   /api/assignments         → assign asset to user
PUT    /api/assignments/return/:id → mark asset returned
```

### Maintenance Requests
```
GET    /api/maintenance         → list all requests (populated)
POST   /api/maintenance         → create new request
PUT    /api/maintenance/:id     → update (resolve, add notes, change status)
PUT    /api/maintenance/:id/assign → assign technician
GET    /api/maintenance/:id/audit  → get audit trail for a request
```

### AI Troubleshooter
```
POST   /api/ai/troubleshoot    → returns diagnosis, steps, severity, confidence
  Body: { message, history[], context: { userRole, assetCount, openRequestCount } }
  Response: { category, severity, confidence, text, cause,
              solutionSteps[], checks[], followUpQuestion,
              nextAction, safetyNotes[], requestDraft, source }
```

---

## 7. Authentication & Authorization Flow

```
1. User submits email + password to POST /api/auth/login
2. authController verifies email exists → bcrypt.compare(password, hash)
3. If valid → sign JWT: { user_id, role } with 8h expiry
4. Frontend stores token in localStorage
5. Axios interceptor (api.js) attaches header to every request:
       Authorization: Bearer <token>
6. authMiddleware.js on every protected route:
       → verifies token → attaches req.user = { user_id, role }
       → 401 if missing/expired
7. roleMiddleware.js on admin-only routes:
       requireRole('admin') → 403 if role not in allowed list
8. On 401 response → Axios interceptor auto-clears localStorage + redirects to /
```

### Role Permission Matrix
| Action | admin | technician | user |
|---|:---:|:---:|:---:|
| View assets / categories | ✅ | ✅ | ✅ |
| Create / edit / delete assets | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| Create maintenance request | ✅ | ✅ | ✅ |
| Assign / resolve requests | ✅ | ✅ | ❌ |
| View all users | ✅ | ❌ | ❌ |
| AI Troubleshooter | ✅ | ✅ | ✅ |

---

## 8. Middleware Stack (Request Lifecycle)

Every incoming request passes through this chain in order:

```
Request
  │
  ├─ securityHeaders       — X-Frame-Options, X-Content-Type-Options, Referrer-Policy
  ├─ requestContext         — Generates unique requestId (UUID or from X-Request-Id header)
  ├─ requestLogger          — Logs: "GET /api/assets 200 45ms [req-uuid]"
  ├─ rateLimiter            — 300 requests / 15 min per IP (in-memory buckets)
  ├─ CORS                   — Allows configured origins + credentials
  ├─ bodyParser             — JSON, max 1MB
  ├─ authMiddleware         — JWT verify → req.user (skipped for /api/auth/*)
  ├─ [roleMiddleware]       — Optional: requireRole() for specific routes
  └─ Route handler
```

---

## 9. AI Troubleshooter — How It Works

The AI Troubleshooter (`/ai-agent`) is the most complex feature. It has two layers:

### Layer 1 — Local Knowledge Base (always available)
A static array of 6 IT issue categories with keyword matching:
- Power / hardware, Network, Printer, Login / access, Asset assignment, Software

When a user sends a message:
1. Keywords are matched against each category (scored)
2. Highest scoring category wins (or "General troubleshooting" fallback)
3. Builds a structured response: severity, cause, solution steps, checks, escalation path

### Layer 2 — Claude AI (when `ANTHROPIC_API_KEY` is set)
```
User message
  → tryClaude() called first
  → Builds system prompt with IT context + user role + asset/request counts
  → Calls claude-opus-4-8 with thinking: { type: "adaptive" }
  → Parses JSON from response
  → Returns { ...parsed, source: "claude" }
  → If Claude fails or key missing → fallback to Layer 1
```

### Response Contract (both layers return the same shape)
```json
{
  "source": "claude" | "local-technician",
  "category": "Network",
  "severity": "Medium",
  "confidence": 82,
  "text": "Summary for the user",
  "cause": "Root cause explanation",
  "solutionSteps": ["Step 1", "Step 2", ...],
  "checks": ["Collect: asset tag", ...],
  "followUpQuestion": "Did step 1 change anything?",
  "nextAction": "Create a Service Desk request if unresolved",
  "safetyNotes": ["Never request passwords", ...],
  "requestDraft": {
    "request_type": "Network Issue",
    "priority": "normal",
    "issue_description": "..."
  }
}
```

### Frontend AI Chat Features
- Auto-detects if user intends to create a service request and does it automatically
- "Get solution" button on each open request — sends the full request context to the AI
- Resolution notes generated by AI can be copied with one click
- "Claude AI" badge appears per message when using the API
- Confidence bar (gradient fill) animates to show diagnosis certainty

---

## 10. Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | bcryptjs (salt rounds: 10) |
| Authentication | JWT HS256, 8h expiry, Bearer token |
| Authorization | Role-based middleware on every write route |
| Rate limiting | 300 req / 15 min per IP (in-memory) |
| Security headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy |
| CORS | Strict origin allowlist from `ALLOWED_ORIGINS` env var |
| Input validation | Required fields, enum checks in Mongoose schema |
| Env validation | Startup check — crashes if required env vars missing |
| Request tracing | Every request gets a unique ID, logged with method + status + duration |

---

## 11. Frontend Architecture

### Routing (React Router v6)
```jsx
<BrowserRouter>
  <Routes>
    <Route path="/"          element={<Login />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<ErrorBoundary><Layout /></ErrorBoundary>}>
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/assets"      element={<Assets />} />
        <Route path="/users"       element={<Users />} />
        <Route path="/categories"  element={<Categories />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/reports"     element={<Reports />} />
        <Route path="/ai-agent"    element={<AIAgent />} />
        <Route path="/settings"    element={<Settings />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
</BrowserRouter>
```

### API Layer (api.js)
```js
// Single Axios instance shared across all pages
const API = axios.create({ baseURL: process.env.REACT_APP_API_URL });

// Request interceptor — injects JWT
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — auto logout on 401
API.interceptors.response.use(null, error => {
  if (error.response?.status === 401) {
    localStorage.clear();
    window.location.href = '/';
  }
  return Promise.reject(error);
});
```

### State Management
No Redux — each page manages its own state with `useState` and `useCallback`. Data is fetched on mount and after mutations. `useMemo` is used for derived state (e.g., filtering active requests, last diagnosis).

---

## 12. Deployment Architecture

```
Developer pushes to GitHub main branch
        │
        ├──► Vercel detects change in /frontend
        │    → npm run build (React production build)
        │    → Deploy static files to CDN
        │    → Injects REACT_APP_API_URL env var
        │
        └──► Render detects change in /backend
             → npm install + npm start
             → Reads env vars from Render dashboard:
               MONGODB_URI, JWT_SECRET, ALLOWED_ORIGINS, ANTHROPIC_API_KEY
```

### Environment Variables
| Variable | Where Set | Purpose |
|---|---|---|
| `MONGODB_URI` | Render dashboard | MongoDB Atlas connection string |
| `JWT_SECRET` | Render dashboard | JWT signing secret (min 32 chars) |
| `ALLOWED_ORIGINS` | Render dashboard | CORS allowed frontend URL |
| `ANTHROPIC_API_KEY` | Render dashboard | Claude AI (optional) |
| `REACT_APP_API_URL` | Vercel dashboard | Backend base URL |

---

## 13. Key Features to Highlight in Interview

### 1. Full CRUD with Role-Based Access
Every resource (assets, users, categories, assignments, maintenance) has Create/Read/Update/Delete with server-side role enforcement — not just hidden UI buttons.

### 2. Audit Trail System
Every maintenance request update writes a `maintenance_audit` document with a JSON diff of changes, editor identity, and role. This is enterprise-grade accountability.

### 3. AI Troubleshooter with Graceful Fallback
The AI layer is production-safe: if no API key is configured, it silently falls back to a local knowledge base. The frontend shows the same UI regardless — the `source` field in the response reveals which layer responded.

### 4. Adaptive Thinking with Claude
Uses `claude-opus-4-8` with `thinking: { type: "adaptive" }` — the model decides how much reasoning to apply based on complexity. This is a newer Anthropic feature that makes the model more accurate on complex IT scenarios without wasting compute on simple ones.

### 5. Database Migration (MySQL → MongoDB)
The app was originally built on MySQL and migrated to MongoDB. This involved rewriting all models from SQL schemas to Mongoose, replacing JOIN queries with Mongoose `.populate()`, and updating all controllers. The migration preserved all existing frontend API contracts.

### 6. Human-Readable IDs
Asset tags (`asset_01`, `asset_02`), category IDs (`cat_01`), and user IDs (`user_01`) are displayed as friendly sequential identifiers in the UI, while MongoDB ObjectIds are used internally. This separation keeps URLs clean and UX friendly.

---

## 14. Common Interview Questions & Answers

**Q: Why MongoDB over MySQL for this project?**
Asset management data is document-oriented — an asset has variable fields (some have warranty info, some don't; categories differ). MongoDB's flexible schema suits this better than a rigid relational table. Also, the asset→category→assignment chain maps naturally to embedded references via Mongoose populate.

**Q: Why Express 5 instead of 4?**
Express 5 handles async errors automatically — if an `async` route handler throws, Express 5 catches it and passes it to the error handler without needing try/catch or `next(err)` everywhere. This reduces boilerplate significantly.

**Q: How do you handle token expiry?**
The Axios response interceptor intercepts any 401 response, clears localStorage (token + user data), and redirects to the login page. The user sees the login screen on next interaction. Server-side, JWT expiry is set to 8 hours to balance security and usability.

**Q: How does the AI fallback work?**
`tryClaude()` checks for `ANTHROPIC_API_KEY` first — if absent, returns `null` immediately. The route handler calls `tryClaude().catch(() => null)` so any API error also returns null. The response is then `aiAnswer || buildLocalAnswer(...)` — the local knowledge base is always the safety net.

**Q: How do you prevent SQL/NoSQL injection?**
Mongoose parameterizes all queries — values passed to `.find()`, `.findById()`, etc. are sanitized by the ODM. No raw query string concatenation is used anywhere. Schema-level `type` and `required` constraints add another validation layer.

**Q: What would you add with more time?**
- WebSocket notifications when a maintenance request is assigned or resolved
- File attachment support for maintenance requests (screenshots, logs)
- Refresh token rotation instead of single-token 8h sessions
- Full-text search on assets using MongoDB Atlas Search

---

## 15. Numbers to Remember

| Metric | Value |
|---|---|
| Total backend routes | ~25 endpoints across 7 route files |
| Database collections | 6 |
| Frontend pages | 10 |
| React components | 7 shared components |
| Lines of CSS | ~2,200+ (single stylesheet) |
| AI knowledge base categories | 6 (power, network, printer, login, assignment, software) |
| JWT expiry | 8 hours |
| Rate limit | 300 requests / 15 minutes per IP |
| Claude model | claude-opus-4-8 |
| Deployment | Auto-deploys on push to main branch |
