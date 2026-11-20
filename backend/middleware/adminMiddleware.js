const pool = require("../config/db");

const parseAdminEmails = () =>
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const isAdminUser = (user = {}) => {
  const adminEmails =
    parseAdminEmails();
  const email =
    String(user.email || "").toLowerCase();

  return (
    user.isAdmin === true ||
    user.is_admin === true ||
    user.role === "admin" ||
    (email &&
      adminEmails.includes(email))
  );
};

const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const result =
      await pool.query(
        "SELECT * FROM users WHERE id = $1",
        [req.user.id]
      );

    if (
      result.rows.length > 0 &&
      isAdminUser(result.rows[0])
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message:
        "Admin access required",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};

module.exports = {
  isAdminUser,
  requireAdmin,
};
