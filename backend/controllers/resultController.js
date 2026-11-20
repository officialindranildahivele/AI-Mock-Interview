const pool = require("../config/db");

const getInterviewResult = async (
  req,
  res
) => {
  try {

    const interviewId =
      req.params.id;

    const result =
      await pool.query(
        `
        SELECT *
        FROM questions
        WHERE interview_id = $1
        ORDER BY id
        `,
        [interviewId]
      );

    res.status(200).json({
      success: true,
      questions: result.rows,
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
  getInterviewResult,
};