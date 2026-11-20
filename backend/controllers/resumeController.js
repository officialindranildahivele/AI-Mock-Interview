const fs = require("fs");
const pdfParse = require("pdf-parse");
const pool = require("../config/db");

const {
  generateResumeQuestions,
} = require(
  "../services/resumeQuestionService"
);
const {
  analyzeResumeText,
} = require("../services/atsAnalyzer");
const {
  parseQuestionList,
} = require("../services/questionParser");

const extractResumeText = async (filePath) => {
  const pdfBuffer =
    fs.readFileSync(filePath);

  const data =
    await pdfParse(
      pdfBuffer
    );

  return data.text;
};

const uploadResume =
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "No resume uploaded",
        });
      }

      const resumeText =
        await extractResumeText(
          req.file.path
        );

      const rawQuestions =
        await generateResumeQuestions(
          resumeText
        );

      const questions =
        parseQuestionList(rawQuestions);

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
            req.user.id,
            "Resume Based Interview",
            0,
            "Resume",
          ]
        );

      const interview =
        interviewResult.rows[0];

      const savedQuestions = [];

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

      res.status(200).json({
        success: true,
        text: resumeText,
        interview,
        questions:
          savedQuestions,
      });

    } catch (error) {
      console.error(
        "Resume Upload Error:"
      );
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

const scanResumeAts =
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "No resume uploaded",
        });
      }

      const resumeText =
        await extractResumeText(
          req.file.path
        );

      const analysis =
        analyzeResumeText(
          resumeText
        );

      res.status(200).json({
        success: true,
        text: resumeText,
        analysis,
      });

    } catch (error) {
      console.error(
        "ATS Scan Error:"
      );
      console.error(error);

      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

module.exports = {
  uploadResume,
  scanResumeAts,
};
