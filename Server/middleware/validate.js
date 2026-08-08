// Validates a request source (default: body) against a Zod schema.
// On success, replaces the source data with the parsed (stripped) result,
// which also prevents mass assignment of unknown fields.
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  req[source] = result.data;
  next();
};

module.exports = validate;
