const pool = require("../config/db");

const getLeaderboard =
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
          WITH stats AS (
            SELECT
              u.id,
              u.name,
              COUNT(DISTINCT i.id) AS interviews,
              COUNT(a.id) AS answered_questions,
              COALESCE(ROUND(AVG(a.score)::numeric, 1), 0) AS average_score,
              COALESCE(MAX(a.score), 0) AS best_score
            FROM users u
            INNER JOIN interviews i
            ON i.user_id = u.id
            INNER JOIN questions q
            ON q.interview_id = i.id
            INNER JOIN answers a
            ON a.question_id = q.id
            GROUP BY u.id, u.name
            HAVING COUNT(a.id) > 0
          ),
          ranked AS (
            SELECT
              *,
              RANK() OVER (
                ORDER BY
                  average_score DESC,
                  best_score DESC,
                  answered_questions DESC
              ) AS rank
            FROM stats
          )
          SELECT
            *
          FROM ranked
          WHERE rank <= 20
          OR id = $1
          ORDER BY rank ASC
          `,
          [req.user.id]
        );

      const leaderboard =
        result.rows.map(
          (item, index) => ({
            rank:
              Number(item.rank || index + 1),
            id: item.id,
            name: item.name,
            interviews:
              Number(item.interviews || 0),
            answeredQuestions:
              Number(item.answered_questions || 0),
            averageScore:
              Number(item.average_score || 0),
            bestScore:
              Number(item.best_score || 0),
            isCurrentUser:
              Number(item.id) ===
              Number(req.user.id),
          })
        );

      res.status(200).json({
        success: true,
        leaderboard,
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
  getLeaderboard,
};
