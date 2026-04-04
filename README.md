# SpendWise

SpendWise is a full-stack personal finance platform with role-based access, AI-assisted insights, and operational dashboards.

## Live

- Frontend: https://finance-frontend-qyrirxowa-karan-bhatis-projects-01ae0c63.vercel.app
- Backend API: https://finance-backend-lo29az9k7-karan-bhatis-projects-01ae0c63.vercel.app
- Health check: https://finance-frontend-qyrirxowa-karan-bhatis-projects-01ae0c63.vercel.app/api/health

## Highlights

- JWT authentication and role-based authorization (viewer, analyst, admin)
- Transactions with filtering, sorting, pagination, and soft delete
- Dashboard and analytics with trends and category insights
- AI advisor integrated through backend Gemini route
- Backend Ops section with health, request metrics, and activity telemetry
- Planner modules: Investments, Budgets, and Goals
- Light mode, enhanced login experience, and modern responsive UI

## Repository Structure

```
finance-backend/   Express API + SQLite data layer
finance-frontend/  Single-file web app (HTML/CSS/JS)
```

## Demo Credentials

- Admin: admin@finance.dev / Admin123!
- Analyst: analyst@finance.dev / Analyst123!
- Viewer: viewer@finance.dev / Viewer123!

## Local Development

### 1) Backend

```bash
cd finance-backend
npm install
npm run seed
npm start
```

Backend runs at http://localhost:3000

### 2) Frontend

Serve the frontend folder as static files:

```bash
cd finance-frontend
python -m http.server 5173
```

Frontend runs at http://localhost:5173

## Environment Variables (Backend)

Create finance-backend/.env with:

```env
PORT=3000
JWT_SECRET=your-local-secret
JWT_EXPIRES_IN=7d
DB_PATH=./finance.db
NODE_ENV=development
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

## Deployment Notes

- Frontend is deployed on Vercel and rewrites /api/* to backend deployment.
- Backend is deployed on Vercel as a Node serverless function.
- Backend bootstrap seeds minimal demo data if database is empty in serverless runtime.

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript, Chart.js
- Backend: Node.js, Express, better-sqlite3, Zod, JWT, bcryptjs
- Deployment: Vercel
