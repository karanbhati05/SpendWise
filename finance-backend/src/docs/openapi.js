const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SpendWise Finance API',
    version: '1.0.0',
    description: 'Interactive API docs for SpendWise backend. Use Authorize with a Bearer JWT from POST /auth/login.',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
  ],
  tags: [
    { name: 'System' },
    { name: 'Auth' },
    { name: 'Transactions' },
    { name: 'Dashboard' },
    { name: 'Users' },
    { name: 'Ops' },
    { name: 'AI' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'boolean', example: true },
          code: { type: 'string', example: 'BAD_REQUEST' },
          message: { type: 'string', example: 'Invalid input' },
        },
        required: ['error', 'code', 'message'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Arjun Mehta' },
          email: { type: 'string', format: 'email', example: 'arjun@company.in' },
          password: { type: 'string', example: 'Password1!' },
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], example: 'viewer' },
        },
        required: ['name', 'email', 'password'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@finance.dev' },
          password: { type: 'string', example: 'Admin123!' },
        },
        required: ['email', 'password'],
      },
      TransactionRequest: {
        type: 'object',
        properties: {
          amount: { type: 'number', example: 5000 },
          type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
          category_id: { type: 'integer', nullable: true, example: 1 },
          date: { type: 'string', example: '2026-04-05' },
          notes: { type: 'string', nullable: true, example: 'Monthly salary' },
        },
        required: ['amount', 'type', 'date'],
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'Rohan Iyer' },
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
          status: { type: 'string', enum: ['active', 'inactive'] },
        },
      },
      AiChatRequest: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Give me 3 ways to reduce expenses by Rs 8000 this month.' },
          model: { type: 'string', example: 'gemini-2.5-flash' },
          history: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant'] },
                content: { type: 'string' },
              },
            },
          },
        },
        required: ['message'],
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string' },
                    env: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Registered successfully' },
          400: {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
          409: {
            description: 'Conflict',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Logged in successfully' },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Current user profile' },
          401: {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/transactions/categories': {
      get: {
        tags: ['Transactions'],
        summary: 'List categories',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Category list' },
        },
      },
    },
    '/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'List transactions',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'category_id', in: 'query', schema: { type: 'integer' } },
          { name: 'date_from', in: 'query', schema: { type: 'string', example: '2026-01-01' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', example: '2026-12-31' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['date', 'amount', 'created_at'] } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated transactions' },
        },
      },
      post: {
        tags: ['Transactions'],
        summary: 'Create transaction (admin)',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransactionRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Transaction created' },
          403: {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get transaction by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Transaction found' },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      patch: {
        tags: ['Transactions'],
        summary: 'Update transaction (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                allOf: [{ $ref: '#/components/schemas/TransactionRequest' }],
              },
            },
          },
        },
        responses: {
          200: { description: 'Transaction updated' },
          403: {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      delete: {
        tags: ['Transactions'],
        summary: 'Delete transaction (admin, soft delete)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Transaction soft-deleted' },
          403: {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Financial summary',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'date_from', in: 'query', schema: { type: 'string', example: '2026-01-01' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', example: '2026-12-31' } },
        ],
        responses: {
          200: { description: 'Summary returned' },
        },
      },
    },
    '/dashboard/recent': {
      get: {
        tags: ['Dashboard'],
        summary: 'Recent activity feed',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }],
        responses: {
          200: { description: 'Recent transactions returned' },
        },
      },
    },
    '/dashboard/categories': {
      get: {
        tags: ['Dashboard'],
        summary: 'Category breakdown (analyst/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'date_from', in: 'query', schema: { type: 'string' } },
          { name: 'date_to', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Category breakdown returned' },
          403: {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/dashboard/trends/monthly': {
      get: {
        tags: ['Dashboard'],
        summary: 'Monthly trends (analyst/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 6 } }],
        responses: {
          200: { description: 'Monthly trends returned' },
        },
      },
    },
    '/dashboard/trends/weekly': {
      get: {
        tags: ['Dashboard'],
        summary: 'Weekly trends (analyst/admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Weekly trends returned' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated users' },
          403: {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'User returned' },
          404: {
            description: 'Not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateUserRequest' },
            },
          },
        },
        responses: {
          200: { description: 'User updated' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user (admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'User deleted' },
        },
      },
    },
    '/ops/health': {
      get: {
        tags: ['Ops'],
        summary: 'Ops health (analyst/admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Ops health returned' },
        },
      },
    },
    '/ops/metrics': {
      get: {
        tags: ['Ops'],
        summary: 'Ops metrics (analyst/admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Ops metrics returned' },
        },
      },
    },
    '/ops/activity': {
      get: {
        tags: ['Ops'],
        summary: 'Recent request activity (analyst/admin)',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }],
        responses: {
          200: { description: 'Request activity returned' },
        },
      },
    },
    '/ops/rbac': {
      get: {
        tags: ['Ops'],
        summary: 'RBAC matrix snapshot (analyst/admin)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'RBAC matrix returned' },
        },
      },
    },
    '/ai/chat': {
      post: {
        tags: ['AI'],
        summary: 'Gemini chat via backend',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AiChatRequest' },
            },
          },
        },
        responses: {
          200: { description: 'AI response generated' },
          503: {
            description: 'AI not configured',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
  },
};

module.exports = openApiSpec;
