require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./utils/errors');
const { trackRequest } = require('./utils/telemetry');
const openApiSpec = require('./docs/openapi');

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const dashboardRoutes   = require('./routes/dashboard');
const opsRoutes         = require('./routes/ops');
const aiRoutes          = require('./routes/ai');

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(trackRequest);

// Rate limiting — 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
}));

// Stricter limit for auth endpoints
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: true, code: 'RATE_LIMITED', message: 'Too many auth attempts' },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

app.get('/docs.json', (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol || 'http';
  res.json({
    ...openApiSpec,
    servers: [{ url: `${protocol}://${host}`, description: 'Current deployment' }],
  });
});

app.get(['/docs', '/docs/'], (req, res) => {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SpendWise API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; background: #fafafa; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/docs.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      displayRequestDuration: true,
      persistAuthorization: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/auth',         authRoutes);
app.use('/users',        userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/dashboard',    dashboardRoutes);
app.use('/ops',          opsRoutes);
app.use('/ai',           aiRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: true, code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` });
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀  Finance API running on http://localhost:${PORT}`);
    console.log(`    Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`    DB path     : ${process.env.DB_PATH || './finance.db'}`);
    console.log('\n    Run  npm run seed  to populate demo data\n');
  });
}

module.exports = app;
