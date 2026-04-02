exports.ownerOnly = (req, res, next) => {

  if (req.user && req.user.role === "owner") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Owner access required"
    });
  }

};