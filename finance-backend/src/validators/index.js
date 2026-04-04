const { z } = require('zod');

// ─── Auth ────────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:     z.string().min(2).max(100).trim(),
  email:    z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  role:     z.enum(['viewer', 'analyst', 'admin']).optional().default('viewer'),
});

const loginSchema = z.object({
  email:    z.string().email().toLowerCase(),
  password: z.string().min(1),
});

// ─── Users ───────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  name:   z.string().min(2).max(100).trim().optional(),
  role:   z.enum(['viewer', 'analyst', 'admin']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' });

// ─── Transactions ─────────────────────────────────────────────────────────────

const transactionSchema = z.object({
  amount:      z.number().positive(),
  type:        z.enum(['income', 'expense']),
  category_id: z.number().int().positive().optional().nullable(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  notes:       z.string().max(500).optional().nullable(),
});

const updateTransactionSchema = transactionSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field required' }
);

const transactionQuerySchema = z.object({
  type:        z.enum(['income', 'expense']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  date_from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:        z.coerce.number().int().min(1).optional().default(1),
  limit:       z.coerce.number().int().min(1).max(100).optional().default(20),
  sort:        z.enum(['date', 'amount', 'created_at']).optional().default('date'),
  order:       z.enum(['asc', 'desc']).optional().default('desc'),
});

// ─── Helper: parse or throw ───────────────────────────────────────────────────

function validate(schema, data) {
  return schema.parse(data); // throws ZodError on failure
}

module.exports = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  transactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
  validate,
};
