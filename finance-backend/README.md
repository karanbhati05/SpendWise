# Finance Dashboard Backend

A backend API for a multi-role finance dashboard system. Built with **Node.js**, **Express**, **SQLite** (`better-sqlite3`), and **JWT** authentication.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env

# 3. Seed demo data (creates finance.db + 3 demo users + ~70 transactions)
npm run seed

# 4. Start the server
npm start
# → http://localhost:3000
```

### Demo Credentials

| Role    | Email                  | Password     |
|---------|------------------------|--------------|
| Admin   | admin@finance.dev      | Admin123!    |
| Analyst | analyst@finance.dev    | Analyst123!  |
| Viewer  | viewer@finance.dev     | Viewer123!   |

---

## Project Structure

```
src/
├── app.js                  # Express app setup, middleware, route mounting
├── routes/
│   ├── auth.js             # /auth — register, login, profile
│   ├── users.js            # /users — admin-only user management
│   ├── transactions.js     # /transactions — CRUD + filtering
│   └── dashboard.js        # /dashboard — summary and trend APIs
├── services/
│   ├── authService.js      # JWT generation, bcrypt, login logic
│   ├── userService.js      # User CRUD
│   ├── transactionService.js  # Transaction CRUD, soft delete, filtering
│   └── summaryService.js   # SQL aggregations for dashboard
├── middleware/
│   ├── authenticate.js     # JWT verification, user hydration
│   └── authorize.js        # RBAC — authorize(...roles), authorizeMinRole(role)
├── models/
│   ├── db.js               # SQLite init, schema creation
│   └── seed.js             # Demo data seeder
├── validators/
│   └── index.js            # Zod schemas for all inputs
└── utils/
    ├── errors.js           # AppError class + errorHandler middleware
    └── response.js         # ok(), created(), paginated() helpers
tests/
├── auth.test.js            # Auth endpoint integration tests
└── transactions.test.js    # Transaction CRUD + RBAC tests
```

---

## Role Permission Matrix

| Endpoint                         | Viewer | Analyst | Admin |
|----------------------------------|:------:|:-------:|:-----:|
| `POST /auth/register`            | ✓      | ✓       | ✓     |
| `POST /auth/login`               | ✓      | ✓       | ✓     |
| `GET  /auth/me`                  | ✓      | ✓       | ✓     |
| `GET  /transactions`             | ✓      | ✓       | ✓     |
| `GET  /transactions/:id`         | ✓      | ✓       | ✓     |
| `POST /transactions`             | ✗      | ✗       | ✓     |
| `PATCH /transactions/:id`        | ✗      | ✗       | ✓     |
| `DELETE /transactions/:id`       | ✗      | ✗       | ✓     |
| `GET  /dashboard/summary`        | ✓      | ✓       | ✓     |
| `GET  /dashboard/recent`         | ✓      | ✓       | ✓     |
| `GET  /dashboard/categories`     | ✗      | ✓       | ✓     |
| `GET  /dashboard/trends/monthly` | ✗      | ✓       | ✓     |
| `GET  /dashboard/trends/weekly`  | ✗      | ✓       | ✓     |
| `GET  /users`                    | ✗      | ✗       | ✓     |
| `PATCH /users/:id`               | ✗      | ✗       | ✓     |
| `DELETE /users/:id`              | ✗      | ✗       | ✓     |

---

## API Reference

All authenticated requests require:
```
Authorization: Bearer <token>
```

All responses share a consistent envelope:
```json
{ "error": false, "data": { ... } }
{ "error": true, "code": "ERROR_CODE", "message": "..." }
```

Paginated responses include:
```json
{ "error": false, "data": [...], "pagination": { "total": 70, "page": 1, "limit": 20, "totalPages": 4 } }
```

---

### Auth

#### `POST /auth/register`
```json
// Body
{ "name": "Alice", "email": "alice@example.com", "password": "Secure1!", "role": "viewer" }

// Response 201
{ "error": false, "data": { "user": { "id": 1, "name": "Alice", ... }, "token": "eyJ..." } }
```

#### `POST /auth/login`
```json
// Body
{ "email": "alice@example.com", "password": "Secure1!" }

// Response 200
{ "error": false, "data": { "user": { ... }, "token": "eyJ..." } }
```

#### `GET /auth/me`
```
// Response 200
{ "error": false, "data": { "id": 1, "name": "Alice", "email": "...", "role": "viewer", "status": "active" } }
```

---

### Transactions

#### `GET /transactions`
Query parameters:
| Param         | Type   | Description                      |
|---------------|--------|----------------------------------|
| `type`        | string | `income` or `expense`            |
| `category_id` | number | Filter by category               |
| `date_from`   | string | `YYYY-MM-DD` — start of range    |
| `date_to`     | string | `YYYY-MM-DD` — end of range      |
| `sort`        | string | `date`, `amount`, `created_at`   |
| `order`       | string | `asc` or `desc` (default: `desc`)|
| `page`        | number | Page number (default: `1`)       |
| `limit`       | number | Per page, max 100 (default: `20`)|

```bash
GET /transactions?type=expense&date_from=2024-01-01&sort=amount&order=desc
```

#### `POST /transactions` _(admin only)_
```json
{ "amount": 5000, "type": "income", "category_id": 1, "date": "2024-03-01", "notes": "March salary" }
```

#### `PATCH /transactions/:id` _(admin only)_
```json
{ "amount": 5200, "notes": "Updated salary" }
```

#### `DELETE /transactions/:id` _(admin only)_
Soft delete — sets `deleted_at`, record is excluded from all queries.

#### `GET /transactions/categories`
Returns all available categories.

---

### Dashboard

#### `GET /dashboard/summary`
Optional query: `date_from`, `date_to`
```json
{
  "total_income": 35000,
  "total_expenses": 18420.50,
  "net_balance": 16579.50,
  "total_records": 72,
  "income_count": 14,
  "expense_count": 58,
  "period": { "date_from": null, "date_to": null }
}
```

#### `GET /dashboard/recent`
Optional query: `limit` (max 50, default 10)
Returns the most recent transactions as an activity feed.

#### `GET /dashboard/categories` _(analyst + admin)_
Optional query: `type`, `date_from`, `date_to`
```json
[
  { "category": "Salary", "type": "income",  "count": 6, "total": 30000, "average": 5000 },
  { "category": "Rent",   "type": "expense", "count": 6, "total": 7200,  "average": 1200 }
]
```

#### `GET /dashboard/trends/monthly` _(analyst + admin)_
Optional query: `months` (default 6, max 24)
```json
[
  { "month": "2024-01", "income": 6200, "expenses": 3100, "net": 3100, "income_count": 2, "expense_count": 14 },
  { "month": "2024-02", "income": 5000, "expenses": 2800, "net": 2200, "income_count": 1, "expense_count": 12 }
]
```

#### `GET /dashboard/trends/weekly` _(analyst + admin)_
Returns week-by-week spending for the current month.

---

### Users _(admin only)_

#### `GET /users` — `?page=1&limit=20`
#### `GET /users/:id`
#### `PATCH /users/:id`
```json
{ "name": "New Name", "role": "analyst", "status": "inactive" }
```
#### `DELETE /users/:id`
Hard delete. Admin cannot delete themselves.

---

## Running Tests

```bash
npm test
```

Tests use an in-memory SQLite database — no cleanup needed between runs. Jest runs both test files with `--runInBand` to avoid DB state conflicts.

---

## Environment Variables

| Variable        | Default              | Description                      |
|-----------------|----------------------|----------------------------------|
| `PORT`          | `3000`               | Server port                      |
| `JWT_SECRET`    | _(required)_         | Secret for signing JWTs          |
| `JWT_EXPIRES_IN`| `7d`                 | Token expiry duration            |
| `DB_PATH`       | `./finance.db`       | SQLite database file path        |
| `NODE_ENV`      | `development`        | Environment (`test` disables logs)|
| `GEMINI_API_KEY`| _(optional)_         | Enables `POST /ai/chat` with Gemini |
| `GEMINI_MODEL`  | `gemini-2.5-flash`   | Gemini model used by backend AI route |

### Gemini Setup (Server-side, Recommended)

1. Create an API key from Google AI Studio.
2. Add it to `.env`:

```bash
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-2.5-flash
```

3. Restart backend and call:

```bash
POST /ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Give me a savings plan for next month",
  "history": []
}
```

4. The frontend AI Advisor can use this endpoint directly once configured.

Note: if your quota is allocated to Gemini 2.5 Flash, keep `GEMINI_MODEL=gemini-2.5-flash`.

### Backend Ops Endpoints

- `GET /ops/health` — service health, runtime, DB reachability
- `GET /ops/metrics` — request telemetry + data-shape metrics
- `GET /ops/activity?limit=20` — recent API request activity
- `GET /ops/rbac` — RBAC matrix snapshot

---

## Design Decisions & Assumptions

### Database
- **SQLite via `better-sqlite3`** — synchronous API, zero server setup, easy to run locally. Appropriate for an assessment; in production this would be PostgreSQL.
- All queries use parameterised statements — no string interpolation in SQL.
- Sort column is whitelisted in `transactionService` to prevent injection via query string.

### Authentication
- Passwords hashed with `bcryptjs` at 10 salt rounds.
- JWT is stateless (no refresh token table used in the base implementation — table exists for extension).
- Token carries `sub` (user ID), `email`, and `role`. Role is re-fetched from DB on each request so role changes take immediate effect without needing a new token.

### RBAC
- Two middleware functions in `authorize.js`:
  - `authorize('admin')` — exact role match, one or many roles.
  - `authorizeMinRole('analyst')` — hierarchy check (viewer < analyst < admin). Used for dashboard routes where analyst and admin should both have access.
- Guards are applied per-route, not globally, keeping the permission model explicit and auditable.

### Soft Delete
- Transactions use `deleted_at IS NULL` filtering everywhere. A deleted record is never returned but the data is preserved for audit purposes.
- Users are hard-deleted (as user data management is admin-only and less frequent).

### Validation
- All input validated with **Zod** before reaching service layer.
- Error responses include a `details` array with field-level messages for validation errors.
- Consistent error envelope: `{ error: true, code, message, details? }`.

### Dashboard Aggregations
- All summary queries run as single SQL aggregations — no row-level JS computation. This keeps performance O(1) in code complexity regardless of record count, and keeps the logic auditable in one place (`summaryService.js`).

### Rate Limiting
- Global: 100 requests / 15 min per IP.
- Auth routes: 20 requests / 15 min per IP (brute-force protection).

### Assumptions
1. Role assignment during registration is open for demo convenience. In a real system, `POST /auth/register` would always create `viewer` accounts and only admins could promote users via `PATCH /users/:id`.
2. Transactions are not user-scoped (any authenticated user can see all transactions). In a real multi-tenant system you'd filter by `user_id` for non-admin roles.
3. Categories are pre-seeded and managed by the seed script. A full system would have `POST /categories` for admins.
