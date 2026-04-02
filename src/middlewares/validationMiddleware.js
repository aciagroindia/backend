exports.validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true, // ✅ allow avatar
    stripUnknown: false,
  });

  if (error) {
    console.log("🚩 Joi Validation Error:", error.details[0].message);
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
    });
  }

  req.body = value;
  next();
};