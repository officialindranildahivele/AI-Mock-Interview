const {
  generateText,
} = require("./aiProvider");

const generateResumeQuestions =
  async (resumeText) => {
    try {

      const prompt = `
You are a technical interviewer.

Analyze the resume below and generate exactly 10 interview questions.

Resume:
${resumeText}

Rules:
- Questions must be based on skills, projects, technologies and experience in the resume.
- Return ONLY a valid JSON array of strings.
- Do not return an object.
- No markdown.

Example:
[
  "Tell me about your main project.",
  "Explain how you used React in your project."
]
`;

      const response =
        await generateText({
          prompt,
          purpose: "resume_question",
          temperature: 0.3,
        });

      return response.text;

    } catch (error) {

      console.error(
        "Resume Question Error:"
      );

      console.error(
        error.response?.data ||
        error.message
      );

      return JSON.stringify([
        "Tell me about yourself.",
        "Explain your main project.",
        "What technologies have you used?",
        "What is OOP?",
        "What is SQL?",
        "Explain one project challenge you solved.",
        "How did you test or debug your project?",
        "What database concepts have you used?",
        "Explain your strongest technical skill.",
        "Why should we hire you for this role?"
      ]);
    }
  };

module.exports = {
  generateResumeQuestions,
};
