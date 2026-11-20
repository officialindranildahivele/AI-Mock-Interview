const pool = require("../config/db");
const {
  generateQuestions,
} = require("../services/geminiService");
const {
  buildFeedbackReport,
} = require("../services/reportBuilder");
const {
  parseQuestionList,
} = require("../services/questionParser");

const createInterview =
  async (req, res) => {
    try {
      const {
        role,
        experience,
        techStack,
        company,
      } = req.body;

      const userId =
        req.user.id;

      const interviewResult =
        await pool.query(
          `
          INSERT INTO interviews
          (
            user_id,
            role,
            experience,
            tech_stack
          )
          VALUES ($1,$2,$3,$4)
          RETURNING *
          `,
          [
            userId,
            role,
            experience,
            techStack,
          ]
        );

      const interview =
        interviewResult.rows[0];

      const rawQuestions =
        await generateQuestions(
          role,
          experience,
          techStack,
          company
        );

      const questions =
        parseQuestionList(rawQuestions);

      const savedQuestions =
        [];

      for (const question of questions) {
        const result =
          await pool.query(
            `
            INSERT INTO questions
            (
              interview_id,
              question
            )
            VALUES ($1,$2)
            RETURNING *
            `,
            [
              interview.id,
              question,
            ]
          );

        savedQuestions.push(
          result.rows[0]
        );
      }

      res.status(201).json({
        success: true,
        interview,
        questions:
          savedQuestions,
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

const getInterviewHistory =
  async (req, res) => {
    try {
      const userId =
        req.user.id;

      const result =
        await pool.query(
          `
          SELECT
            i.*,
            COALESCE(
              ROUND(AVG(a.score)::numeric, 1),
              0
            ) AS average_score,
            COALESCE(MAX(a.score), 0) AS best_score,
            COUNT(DISTINCT q.id) AS total_questions,
            COUNT(a.id) AS answered_questions
          FROM interviews i
          LEFT JOIN questions q
          ON q.interview_id = i.id
          LEFT JOIN answers a
          ON a.question_id = q.id
          WHERE i.user_id = $1
          GROUP BY i.id
          ORDER BY created_at DESC
          `,
          [userId]
        );

      res.status(200).json({
        success: true,
        interviews:
          result.rows,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

const getInterviewDetails =
  async (req, res) => {
    try {
      const interviewId =
        req.params.id;
      const userId =
        req.user.id;

      const result =
        await pool.query(
          `
          SELECT
            q.id,
            q.question,
            a.answer,
            a.score,
            a.feedback
          FROM questions q
          INNER JOIN interviews i
          ON i.id = q.interview_id
          LEFT JOIN LATERAL (
            SELECT
              answer,
              score,
              feedback
            FROM answers
            WHERE question_id = q.id
            ORDER BY id DESC
            LIMIT 1
          ) a ON true
          WHERE q.interview_id = $1
          AND i.user_id = $2
          ORDER BY q.id
          `,
          [interviewId, userId]
        );

      res.status(200).json({
        success: true,
        questions:
          result.rows,
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

const getInterviewResults =
  async (req, res) => {
    try {

      const interviewId =
        req.params.id;
      const userId =
        req.user.id;

      const result =
        await pool.query(
          `
          SELECT
            q.id,
            q.question,
            a.answer,
            a.score,
            a.feedback
          FROM questions q
          INNER JOIN interviews i
          ON i.id = q.interview_id
          LEFT JOIN LATERAL (
            SELECT
              answer,
              score,
              feedback
            FROM answers
            WHERE question_id = q.id
            ORDER BY id DESC
            LIMIT 1
          ) a ON true
          WHERE q.interview_id = $1
          AND i.user_id = $2
          ORDER BY q.id
          `,
          [interviewId, userId]
        );

      res.status(200).json({
        success: true,
        results:
          result.rows,
        report:
          buildFeedbackReport(
            result.rows
          ),
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

module.exports = {
  createInterview,
  getInterviewHistory,
  getInterviewDetails,
  getInterviewResults,
};
