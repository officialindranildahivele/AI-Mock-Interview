const DEFAULT_QUESTIONS = [
  "Tell me about yourself.",
  "Explain your strongest project.",
  "Which technologies have you used recently?",
  "What is object-oriented programming?",
  "Explain SQL joins.",
  "What is the difference between an array and a linked list?",
  "How do you handle errors in your applications?",
  "Explain authentication and authorization.",
  "What is time complexity?",
  "Why should we hire you?",
];

const stripCodeFences = (value = "") =>
  String(value)
    .replace(/```json/gi, "")
    .replace(/```javascript/gi, "")
    .replace(/```js/gi, "")
    .replace(/```/g, "")
    .trim();

const normalizeQuestion = (item) => {
  if (typeof item === "string") {
    return item.trim();
  }

  if (item && typeof item === "object") {
    return String(
      item.question ||
        item.text ||
        item.prompt ||
        item.title ||
        ""
    ).trim();
  }

  return "";
};

const normalizeQuestionList = (items) =>
  Array.isArray(items)
    ? items
        .map(normalizeQuestion)
        .map((question) =>
          question
            .replace(/^["']|["']$/g, "")
            .replace(/,$/, "")
            .trim()
        )
        .filter((question) => question.length > 0)
    : [];

const parseJsonCandidate = (candidate) => {
  const parsed = JSON.parse(candidate);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.questions)) {
      return parsed.questions;
    }

    if (Array.isArray(parsed.interviewQuestions)) {
      return parsed.interviewQuestions;
    }

    if (Array.isArray(parsed.data)) {
      return parsed.data;
    }
  }

  return [];
};

const parseStructuredQuestions = (cleaned) => {
  const candidates = [cleaned];
  const arrayStart = cleaned.indexOf("[");
  const arrayEnd = cleaned.lastIndexOf("]");
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");

  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    candidates.push(cleaned.slice(arrayStart, arrayEnd + 1));
  }

  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    candidates.push(cleaned.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const questions = normalizeQuestionList(parseJsonCandidate(candidate));

      if (questions.length > 0) {
        return questions;
      }
    } catch (error) {
      // Try the next likely JSON candidate.
    }
  }

  return [];
};

const parseLineQuestions = (cleaned) =>
  cleaned
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*[-*•]\s*/, "")
        .replace(/^\s*\d+[.)]\s*/, "")
        .replace(/^question\s*\d+\s*[:.-]\s*/i, "")
        .replace(/^["']|["']$/g, "")
        .replace(/,$/, "")
        .trim()
    )
    .filter((line) => {
      if (line.length < 12) {
        return false;
      }

      return (
        line.includes("?") ||
        /^(explain|describe|tell|what|how|why|when|where|which|difference)/i.test(
          line
        )
      );
    });

const parseQuestionList = (
  rawQuestions,
  options = {}
) => {
  const limit = options.limit || 10;
  const fallbackQuestions =
    options.fallbackQuestions ||
    DEFAULT_QUESTIONS;
  const cleaned =
    stripCodeFences(rawQuestions);
  const structuredQuestions =
    parseStructuredQuestions(cleaned);
  const questions =
    structuredQuestions.length > 0
      ? structuredQuestions
      : parseLineQuestions(cleaned);
  const seededQuestions = [
    ...questions,
    ...fallbackQuestions,
  ];
  const uniqueQuestions = Array.from(
    new Set(seededQuestions)
  ).slice(0, limit);

  if (uniqueQuestions.length > 0) {
    return uniqueQuestions;
  }

  return fallbackQuestions.slice(0, limit);
};

module.exports = {
  parseQuestionList,
  DEFAULT_QUESTIONS,
};
