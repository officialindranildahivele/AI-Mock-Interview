const pool = require("../config/db");

const getSingleValue = (result, key) =>
  Number(result.rows[0]?.[key] || 0);

const getAdminOverview =
  async (req, res) => {
    try {
      const [
        usersResult,
        interviewsResult,
        questionsResult,
        answersResult,
        leaderboardResult,
        mistakesResult,
      ] = await Promise.all([
        pool.query(
          "SELECT COUNT(*) AS total_users FROM users"
        ),
        pool.query(
          "SELECT COUNT(*) AS total_interviews FROM interviews"
        ),
        pool.query(
          "SELECT COUNT(*) AS total_questions FROM questions"
        ),
        pool.query(
          `
          SELECT
            COUNT(*) AS total_answers,
            COALESCE(ROUND(AVG(score)::numeric, 1), 0) AS average_score
          FROM answers
          `
        ),
        pool.query(
          `
          SELECT
            u.name,
            u.email,
            COUNT(DISTINCT i.id) AS interviews,
            COALESCE(ROUND(AVG(a.score)::numeric, 1), 0) AS average_score
          FROM users u
          LEFT JOIN interviews i
          ON i.user_id = u.id
          LEFT JOIN questions q
          ON q.interview_id = i.id
          LEFT JOIN answers a
          ON a.question_id = q.id
          GROUP BY u.id
          ORDER BY average_score DESC, interviews DESC
          LIMIT 5
          `
        ),
        pool.query(
          `
          SELECT
            feedback,
            COUNT(*) AS count
          FROM answers
          WHERE feedback IS NOT NULL
          AND feedback <> ''
          GROUP BY feedback
          ORDER BY count DESC
          LIMIT 5
          `
        ),
      ]);

      res.status(200).json({
        success: true,
        overview: {
          totalUsers:
            getSingleValue(
              usersResult,
              "total_users"
            ),
          totalInterviews:
            getSingleValue(
              interviewsResult,
              "total_interviews"
            ),
          totalQuestions:
            getSingleValue(
              questionsResult,
              "total_questions"
            ),
          totalAnswers:
            getSingleValue(
              answersResult,
              "total_answers"
            ),
          averageScore:
            Number(
              answersResult.rows[0]?.average_score || 0
            ),
          leaderboard:
            leaderboardResult.rows,
          commonMistakes:
            mistakesResult.rows,
          aiUsage: {
            generatedQuestions:
              getSingleValue(
                questionsResult,
                "total_questions"
              ),
            evaluatedAnswers:
              getSingleValue(
                answersResult,
                "total_answers"
              ),
          },
        },
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

module.exports = {
  getAdminOverview,
};
