const toScore = (value) => Number(value || 0);

const clamp = (value, min = 0, max = 10) =>
  Math.max(min, Math.min(max, value));

const countWords = (value = "") =>
  value.trim().split(/\s+/).filter(Boolean).length;

const extractTopic = (question = "") => {
  const cleaned = question
    .replace(/^(explain|what is|what are|how does|describe|difference between)\s+/i, "")
    .replace(/[?.]/g, "")
    .trim();

  return cleaned.length > 70 ? `${cleaned.slice(0, 70)}...` : cleaned;
};

const getHiringRecommendation = (overallScore) => {
  if (overallScore >= 8) {
    return "Recommended for Technical Round 2";
  }

  if (overallScore >= 6.5) {
    return "Recommended with focused revision";
  }

  if (overallScore >= 5) {
    return "Needs one more practice round before shortlisting";
  }

  return "Not ready yet; revise fundamentals and retry";
};

const getStrengths = (overallScore, answeredResults) => {
  const strongQuestions = answeredResults
    .filter((item) => toScore(item.score) >= 8)
    .map((item) => extractTopic(item.question))
    .filter(Boolean)
    .slice(0, 2);

  if (strongQuestions.length > 0) {
    return [
      `Strong answers in ${strongQuestions.join(", ")}`,
      "Used enough detail for AI evaluation",
      overallScore >= 7 ? "Shows interview-ready direction" : "Built a useful baseline for improvement",
    ];
  }

  return [
    "Completed measurable interview practice",
    "Submitted answers that can be improved with feedback",
    "Has a clear revision path from the report",
  ];
};

const getWeaknesses = (overallScore, answeredResults) => {
  const weakQuestions = answeredResults
    .filter((item) => toScore(item.score) < 7)
    .map((item) => extractTopic(item.question))
    .filter(Boolean)
    .slice(0, 3);

  if (weakQuestions.length > 0) {
    return weakQuestions.map((topic) => `Improve depth in ${topic}`);
  }

  if (overallScore >= 8) {
    return [
      "Add more trade-offs and edge cases",
      "Use stronger project metrics where possible",
    ];
  }

  return [
    "Add examples to make answers more convincing",
    "Use clearer closing statements",
    "Revise lower-confidence fundamentals",
  ];
};

const getRecommendedTopics = (answeredResults) => {
  const topics = answeredResults
    .filter((item) => toScore(item.score) < 7)
    .map((item) => extractTopic(item.question))
    .filter(Boolean)
    .slice(0, 5);

  if (topics.length > 0) {
    return topics;
  }

  return [
    "System design basics",
    "Project architecture",
    "Complexity analysis",
    "Database indexing",
    "Behavioral examples",
  ];
};

const buildFeedbackReport = (results = []) => {
  const answeredResults = results.filter(
    (item) => item.score !== null && item.score !== undefined
  );
  const scoreTotal = answeredResults.reduce(
    (sum, item) => sum + toScore(item.score),
    0
  );
  const overallScore =
    answeredResults.length === 0 ? 0 : scoreTotal / answeredResults.length;
  const averageWords =
    answeredResults.length === 0
      ? 0
      : answeredResults.reduce(
          (sum, item) => sum + countWords(item.answer || ""),
          0
        ) / answeredResults.length;
  const completionBoost =
    answeredResults.length === results.length && results.length > 0 ? 0.6 : -0.4;

  const technicalScore = clamp(overallScore);
  const communicationScore = clamp(
    overallScore + (averageWords >= 45 ? 0.8 : averageWords >= 25 ? 0.3 : -0.6)
  );
  const confidenceScore = clamp(overallScore + completionBoost);

  return {
    overallScore: Number(overallScore.toFixed(1)),
    technicalScore: Number(technicalScore.toFixed(1)),
    communicationScore: Number(communicationScore.toFixed(1)),
    confidenceScore: Number(confidenceScore.toFixed(1)),
    answeredQuestions: answeredResults.length,
    totalQuestions: results.length,
    strengths: getStrengths(overallScore, answeredResults),
    weaknesses: getWeaknesses(overallScore, answeredResults),
    recommendedTopics: getRecommendedTopics(answeredResults),
    hiringRecommendation: getHiringRecommendation(overallScore),
  };
};

module.exports = {
  buildFeedbackReport,
};
