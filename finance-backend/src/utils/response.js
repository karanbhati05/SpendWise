const ok = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ error: false, data });

const created = (res, data) => ok(res, data, 201);

const paginated = (res, { data, total, page, limit }) =>
  res.status(200).json({
    error: false,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });

module.exports = { ok, created, paginated };
