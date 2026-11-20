const pool = require("../config/db");
const {
  evaluateAnswer,
} = require("../services/evaluateAnswer");
const {
  transcribeAudio,
} = require("../services/transcribeAudio");

const submitAnswer = async (
  req,
  res
) => {
  try {
    const {
      questionId,
      answer,
    } = req.body;

    if (!questionId || !answer?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Question and answer are required",
      });
    }

    const questionResult =
      await pool.query(
        `
        SELECT
          q.id,
          q.question
        FROM questions q
        INNER JOIN interviews i
        ON i.id = q.interview_id
        WHERE q.id = $1
        AND i.user_id = $2
        `,
        [questionId, req.user.id]
      );

    if (
      questionResult.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Question not found",
      });
    }

    const question =
      questionResult.rows[0];

    const evaluation =
      await evaluateAnswer(
        question.question,
        answer
      );

    const parsed =
      JSON.parse(evaluation);
    const feedback = [
      parsed.strengths
        ? `Strengths: ${parsed.strengths}`
        : "",
      parsed.improvements
        ? `Improve: ${parsed.improvements}`
        : "",
    ].filter(Boolean).join(" | ");

    await pool.query(
      `
      INSERT INTO answers
      (
        question_id,
        answer,
        score,
        feedback
      )
      VALUES
      ($1,$2,$3,$4)
      `,
      [
        questionId,
        answer,
        parsed.score,
        feedback,
      ]
    );

    res.status(200).json({
      success: true,
      evaluation: {
        score:
          parsed.score,
        feedback:
          feedback,
      },
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

const transcribeVoiceAnswer = async (
  req,
  res
) => {
  try {
    const {
      audio,
      mimeType,
    } = req.body;

    if (!audio) {
      return res.status(400).json({
        success: false,
        message:
          "Audio recording is required",
      });
    }

    const transcript =
      await transcribeAudio({
        audio,
        mimeType,
      });

    res.status(200).json({
      success: true,
      transcript,
    });

  } catch (error) {
    console.error(
      "Voice Transcription Error:"
    );
    console.error(
      error.response?.data ||
      error.message
    );

    res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Voice transcription failed",
    });
  }
};

module.exports = {
  submitAnswer,
  transcribeVoiceAnswer,
};
