const pool = require("../config/db");

const getInterviewHistory = async (
  req,
  res
) => {
  try {

    const userId = req.user.id;

    const result =
      await pool.query(
        `
        SELECT *
        FROM interviews
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
      );

    res.status(200).json({
      success: true,
      interviews: result.rows,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getInterviewHistory,
};