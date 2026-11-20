const {
  generateText,
} = require("./aiProvider");

const generateQuestions = async (
  role,
  experience,
  techStack,
  company
) => {
  try {
    const companyInstruction = company
      ? `
Company style: ${company}
Match the interview pattern, difficulty, and emphasis commonly expected for this company.
`
      : "";

    const prompt = `
Generate 10 interview questions.

Role: ${role}
Experience: ${experience} years
Skills: ${techStack}
${companyInstruction}

Return ONLY a valid JSON array of strings.
Do not return an object.
No markdown.

Example:
[
  "Question 1",
  "Question 2"
]
`;

    const response =
      await generateText({
        prompt,
        purpose: "question",
        temperature: 0.3,
      });

    return response.text;

  } catch (error) {
    console.error("Question AI Error:");

    console.error(
      error.response?.data ||
      error.message
    );

    return JSON.stringify([
      "What is OOP?",
      "Explain JVM.",
      "What is SQL?",
      "What is DBMS?",
      "What is Inheritance?",
      "What is Polymorphism?",
      "What is Encapsulation?",
      "Difference between Array and ArrayList?",
      "What is a Primary Key?",
      "What is Exception Handling?"
    ]);
  }
};

module.exports = {
  generateQuestions,
};
