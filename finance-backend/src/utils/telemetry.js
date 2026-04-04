const startedAtMs = Date.now();
const MAX_RECENT_REQUESTS = 300;

const routeStats = new Map();
const recentRequests = [];

function toRouteKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[idx].toFixed(2));
}

function addRequestSample(sample) {
  const key = toRouteKey(sample.method, sample.path);
  const stat = routeStats.get(key) || {
    method: sample.method,
    path: sample.path,
    count: 0,
    errors: 0,
    totalMs: 0,
    durations: [],
    lastStatus: 200,
    lastAt: null,
  };

  stat.count += 1;
  stat.lastStatus = sample.status;
  stat.lastAt = sample.at;
  stat.totalMs += sample.duration_ms;
  stat.durations.push(sample.duration_ms);
  if (stat.durations.length > 500) stat.durations.shift();
  if (sample.status >= 400) stat.errors += 1;

  routeStats.set(key, stat);

  recentRequests.unshift(sample);
  if (recentRequests.length > MAX_RECENT_REQUESTS) recentRequests.pop();
}

function trackRequest(req, res, next) {
  const startNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const pathOnly = req.originalUrl.split('?')[0] || req.path || '/';

    addRequestSample({
      method: req.method,
      path: pathOnly,
      status: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      at: new Date().toISOString(),
    });
  });

  next();
}

function getTelemetrySummary() {
  const routeEntries = [...routeStats.values()]
    .map((s) => ({
      method: s.method,
      path: s.path,
      count: s.count,
      errors: s.errors,
      error_rate_pct: s.count ? Number(((s.errors / s.count) * 100).toFixed(2)) : 0,
      avg_latency_ms: s.count ? Number((s.totalMs / s.count).toFixed(2)) : 0,
      p95_latency_ms: percentile(s.durations, 95),
      last_status: s.lastStatus,
      last_at: s.lastAt,
    }))
    .sort((a, b) => b.count - a.count);

  const totalRequests = routeEntries.reduce((sum, r) => sum + r.count, 0);
  const totalErrors = routeEntries.reduce((sum, r) => sum + r.errors, 0);
  const allDurations = routeEntries.flatMap((r) => {
    const key = toRouteKey(r.method, r.path);
    return routeStats.get(key)?.durations || [];
  });

  return {
    started_at: new Date(startedAtMs).toISOString(),
    uptime_seconds: Math.floor((Date.now() - startedAtMs) / 1000),
    total_requests: totalRequests,
    total_errors: totalErrors,
    error_rate_pct: totalRequests ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
    p95_latency_ms: percentile(allDurations, 95),
    routes: routeEntries,
  };
}

function getRecentRequests(limit = 20) {
  return recentRequests.slice(0, Math.max(1, Math.min(limit, 100)));
}

module.exports = {
  trackRequest,
  getTelemetrySummary,
  getRecentRequests,
};