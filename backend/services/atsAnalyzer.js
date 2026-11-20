const KEYWORDS = {
  frontend: [
    "html",
    "css",
    "javascript",
    "typescript",
    "react",
    "redux",
    "vite",
    "tailwind",
    "accessibility",
  ],
  backend: [
    "node",
    "express",
    "api",
    "rest",
    "postgresql",
    "mongodb",
    "sql",
    "jwt",
    "authentication",
  ],
  devops: [
    "docker",
    "aws",
    "linux",
    "git",
    "ci",
    "deployment",
    "vercel",
    "render",
  ],
  computerScience: [
    "data structures",
    "algorithms",
    "oop",
    "dbms",
    "operating system",
    "networking",
    "complexity",
  ],
  professional: [
    "project",
    "internship",
    "leadership",
    "collaboration",
    "problem solving",
    "communication",
  ],
};

const flattenKeywords = () => Object.values(KEYWORDS).flat();

const normalize = (text = "") =>
  text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ");

const hasKeyword = (text, keyword) => {
  const normalizedKeyword = keyword.toLowerCase();

  if (normalizedKeyword.includes(" ")) {
    return text.includes(normalizedKeyword);
  }

  return new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);
};

const analyzeResumeText = (resumeText = "") => {
  const normalizedText = normalize(resumeText);
  const keywords = flattenKeywords();
  const skillsFound = keywords.filter((keyword) =>
    hasKeyword(normalizedText, keyword)
  );
  const missingKeywords = keywords
    .filter((keyword) => !skillsFound.includes(keyword))
    .slice(0, 12);

  const sectionSignals = [
    "experience",
    "projects",
    "education",
    "skills",
    "certifications",
    "achievements",
  ];
  const sectionsFound = sectionSignals.filter((section) =>
    normalizedText.includes(section)
  );
  const wordCount = resumeText.trim().split(/\s+/).filter(Boolean).length;
  const keywordScore = Math.min(50, Math.round((skillsFound.length / keywords.length) * 50));
  const sectionScore = Math.round((sectionsFound.length / sectionSignals.length) * 25);
  const lengthScore = wordCount >= 250 && wordCount <= 850 ? 15 : wordCount > 120 ? 10 : 5;
  const contactScore =
    /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resumeText) ||
    /\+?\d[\d\s-]{8,}/.test(resumeText)
      ? 10
      : 4;
  const atsScore = Math.min(100, keywordScore + sectionScore + lengthScore + contactScore);

  const skillsAnalysis = Object.entries(KEYWORDS).map(([category, values]) => {
    const found = values.filter((keyword) => skillsFound.includes(keyword));

    return {
      category,
      found,
      missing: values.filter((keyword) => !found.includes(keyword)),
      score: Math.round((found.length / values.length) * 100),
    };
  });

  const suggestions = [
    sectionsFound.includes("projects")
      ? "Add measurable impact to your strongest projects."
      : "Add a Projects section with tech stack, problem, and measurable result.",
    skillsFound.includes("docker") || skillsFound.includes("aws")
      ? "Keep cloud and deployment keywords visible near project descriptions."
      : "Add deployment keywords such as Docker, AWS, CI, or cloud hosting if you have used them.",
    wordCount < 250
      ? "Resume looks short; add stronger bullet points for experience and projects."
      : "Keep bullets concise and start them with action verbs.",
    missingKeywords.length > 0
      ? `Consider adding relevant missing keywords: ${missingKeywords.slice(0, 5).join(", ")}.`
      : "Keyword coverage is strong; focus on quantified achievements.",
  ];

  return {
    atsScore,
    wordCount,
    skillsFound: skillsFound.slice(0, 18),
    missingKeywords,
    sectionsFound,
    skillsAnalysis,
    suggestions,
  };
};

module.exports = {
  analyzeResumeText,
};
