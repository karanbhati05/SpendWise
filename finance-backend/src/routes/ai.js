const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { badRequestError, AppError } = require('../utils/errors');
const { ok } = require('../utils/response');
const { getDb } = require('../models/db');

const router = Router();

function toGeminiContents(history, userMessage) {
  const normalizedHistory = Array.isArray(history)
    ? history
      .filter(item => item && typeof item.content === 'string' && item.content.trim())
      .slice(-12)
      .map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content.trim() }],
      }))
    : [];

  normalizedHistory.push({
    role: 'user',
    parts: [{ text: userMessage.trim() }],
  });

  return normalizedHistory;
}

function getUserFinanceContext(userId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  AND deleted_at IS NULL THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' AND deleted_at IS NULL THEN amount ELSE 0 END), 0) AS expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  AND deleted_at IS NULL THEN 1 ELSE 0 END), 0) AS income_count,
      COALESCE(SUM(CASE WHEN type = 'expense' AND deleted_at IS NULL THEN 1 ELSE 0 END), 0) AS expense_count
    FROM transactions
  `).get();

  const net = Number(row.income) - Number(row.expenses);
  const savingsRate = Number(row.income) > 0 ? ((net / Number(row.income)) * 100).toFixed(1) : '0.0';

  return {
    userId,
    income: Number(row.income),
    expenses: Number(row.expenses),
    income_count: Number(row.income_count),
    expense_count: Number(row.expense_count),
    net,
    savings_rate_pct: Number(savingsRate),
  };
}

router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const { message, history, model } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      throw badRequestError('message is required');
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      throw new AppError('Gemini is not configured on backend. Set GEMINI_API_KEY in .env.', 503, 'AI_NOT_CONFIGURED');
    }

    const selectedModel =
      (typeof model === 'string' && model.trim()) ||
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash';
    const finance = getUserFinanceContext(req.user.id);

    const systemText = `You are Ledger AI, a high-signal financial advisor for an Indian finance dashboard.
Respond with concise, practical recommendations.
Use INR (Rs) and Indian context (SIP, PPF, FD, ELSS, emergency fund).
Reference data points when useful.

Current context:
- User: ${req.user.name} (${req.user.role})
- Income: Rs ${finance.income.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- Expenses: Rs ${finance.expenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- Net: Rs ${finance.net.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
- Savings rate: ${finance.savings_rate_pct}%
- Income entries: ${finance.income_count}
- Expense entries: ${finance.expense_count}`;

    const requestBody = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: toGeminiContents(history, message),
      generationConfig: {
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 700,
      },
    };

    const startedAt = Date.now();
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new AppError(data.error?.message || 'Gemini request failed', 502, 'AI_UPSTREAM_ERROR');
    }

    const reply = (data.candidates || [])
      .flatMap(candidate => candidate.content?.parts || [])
      .map(part => part.text || '')
      .join('\n')
      .trim();

    if (!reply) {
      throw new AppError('Gemini returned an empty response', 502, 'AI_EMPTY_RESPONSE');
    }

    ok(res, {
      provider: 'gemini',
      model: selectedModel,
      latency_ms: Date.now() - startedAt,
      reply,
      usage: data.usageMetadata || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;