const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
};

module.exports = requireRole;
