const {
  generateText,
} = require("./aiProvider");

const countWords = (value = "") =>
  value.trim().split(/\s+/).filter(Boolean).length;

const hasExampleSignal = (answer = "") =>
  /\b(example|project|used|implemented|built|designed|scenario|case)\b/i.test(
    answer
  );

const hasTechnicalSignal = (answer = "") =>
  /\b(complexity|database|api|state|memory|thread|query|index|component|class|object|algorithm|security|scale)\b/i.test(
    answer
  );

const clampScore = (value) =>
  Math.max(1, Math.min(10, Number(value || 1)));

const parseJsonResponse = (content = "") => {
  const cleaned = content
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("AI evaluation response was not JSON");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
};

const buildHeuristicEvaluation = (question, answer) => {
  const words =
    countWords(answer);
  const usesExample =
    hasExampleSignal(answer);
  const usesTechnicalTerms =
    hasTechnicalSignal(answer);

  let score = 3;

  if (words >= 25) score += 1;
  if (words >= 55) score += 1.5;
  if (words >= 95) score += 1;
  if (usesExample) score += 1;
  if (usesTechnicalTerms) score += 1.5;

  score =
    Math.max(
      1,
      Math.min(
        10,
        Math.round(score)
      )
    );

  const strengths = [];
  const improvements = [];

  if (words >= 55) {
    strengths.push(
      "Answer has enough detail for evaluation"
    );
  } else {
    improvements.push(
      "Expand the answer with one clear example"
    );
  }

  if (usesExample) {
    strengths.push(
      "Includes practical or project context"
    );
  } else {
    improvements.push(
      "Connect the concept to a real project or scenario"
    );
  }

  if (usesTechnicalTerms) {
    strengths.push(
      "Uses relevant technical terminology"
    );
  } else {
    improvements.push(
      "Add precise technical terms and trade-offs"
    );
  }

  improvements.push(
    `Revise the core concept behind: ${question}`
  );

  return {
    score,
    strengths:
      strengths.join("; ") ||
      "Good attempt",
    improvements:
      improvements.join("; "),
  };
};

const evaluateWithAI = async (
  question,
  answer
) => {
  const prompt = `
You are an interview evaluator.

Question:
${question}

Candidate answer:
${answer}

Return ONLY valid JSON with this exact shape:
{
  "score": 8,
  "strengths": "Short semicolon-separated strengths",
  "improvements": "Short semicolon-separated improvements"
}

Scoring rules:
- Score from 1 to 10.
- Reward technical correctness, examples, communication, confidence, and depth.
- Penalize vague answers, missing examples, incorrect terminology, and weak reasoning.
`;

  const response =
    await generateText({
      prompt,
      purpose: "evaluation",
      temperature: 0.2,
    });

  const parsed =
    parseJsonResponse(
      response.text
    );

  return {
    score:
      Math.round(
        clampScore(parsed.score)
      ),
    strengths:
      parsed.strengths ||
      "Good attempt",
    improvements:
      parsed.improvements ||
      "Add more technical depth and examples",
  };
};

const evaluateAnswer = async (
  question,
  answer
) => {
  try {
    const aiEvaluation =
      await evaluateWithAI(
        question,
        answer
      );

    return JSON.stringify(
      aiEvaluation
    );
  } catch (error) {
    console.error(
      "AI Evaluation Error:"
    );
    console.error(
      error.response?.data ||
      error.message
    );
  }

  return JSON.stringify(
    buildHeuristicEvaluation(
      question,
      answer
    )
  );
};

module.exports = {
  evaluateAnswer,
};
