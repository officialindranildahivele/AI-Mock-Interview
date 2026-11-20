import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

const toScore = (value) => Number(value || 0);

const getAnsweredResults = (results) =>
  results.filter((item) => item.score !== null && item.score !== undefined);

const clampScore = (value) => Math.max(0, Math.min(10, value));

const getSuggestedTopics = (results) => {
  const lowScoreQuestions = results
    .filter((item) => toScore(item.score) < 7)
    .map((item) => item.question)
    .filter(Boolean)
    .slice(0, 3);

  if (lowScoreQuestions.length > 0) {
    return lowScoreQuestions.map((question) =>
      question.length > 92 ? `${question.slice(0, 92)}...` : question
    );
  }

  return [
    "Practice concise STAR-style examples",
    "Revise fundamentals from your selected tech stack",
    "Prepare one production-level project explanation",
  ];
};

const sanitizePdfText = (value) =>
  String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapPdfLine = (line, limit = 82) => {
  const words = String(line).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length > limit && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [""];
};

const buildPdfBlob = (title, lines) => {
  const wrappedLines = lines.flatMap((line) => wrapPdfLine(line));
  const content = [
    "BT",
    "/F1 22 Tf",
    "72 760 Td",
    `(${sanitizePdfText(title)}) Tj`,
    "/F1 11 Tf",
    "0 -34 Td",
    ...wrappedLines.flatMap((line) => [
      `(${sanitizePdfText(line)}) Tj`,
      "0 -18 Td",
    ]),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], {
    type: "application/pdf",
  });
};

const downloadPdf = (filename, title, lines) => {
  const url = URL.createObjectURL(buildPdfBlob(title, lines));
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [results, setResults] = useState([]);
  const [serverReport, setServerReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await API.get(`/interview/results/${id}`);
        setResults(res.data.results || []);
        setServerReport(res.data.report || null);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [id]);

  const report = useMemo(() => {
    const answered = getAnsweredResults(results);
    const total = results.length;
    const scoreTotal = answered.reduce(
      (sum, item) => sum + toScore(item.score),
      0
    );
    const overall = answered.length === 0 ? 0 : scoreTotal / answered.length;
    const best = answered.reduce(
      (max, item) => Math.max(max, toScore(item.score)),
      0
    );

    if (serverReport) {
      return {
        answered: serverReport.answeredQuestions ?? answered.length,
        total: serverReport.totalQuestions ?? total,
        overall: toScore(serverReport.overallScore),
        best,
        communication: toScore(serverReport.communicationScore),
        confidence: toScore(serverReport.confidenceScore),
        technical: toScore(serverReport.technicalScore),
        strengths: serverReport.strengths || [],
        weaknesses: serverReport.weaknesses || [],
        topics: serverReport.recommendedTopics || [],
        hiringRecommendation:
          serverReport.hiringRecommendation || "Review needed",
      };
    }

    const averageWords =
      answered.length === 0
        ? 0
        : answered.reduce(
            (sum, item) =>
              sum + String(item.answer || "").trim().split(/\s+/).filter(Boolean).length,
            0
          ) / answered.length;

    const communication = clampScore(
      overall + (averageWords >= 45 ? 0.8 : averageWords >= 25 ? 0.3 : -0.6)
    );
    const confidence = clampScore(
      overall + (answered.length === total && total > 0 ? 0.6 : -0.4)
    );
    const technical = clampScore(overall);

    const strengths =
      overall >= 8
        ? [
            "Strong command of core concepts",
            "Clear answer structure across the round",
            "Ready for tougher follow-up questions",
          ]
        : overall >= 6
          ? [
              "Good baseline understanding",
              "Several answers show interview-ready direction",
              "Feedback is specific enough to improve quickly",
            ]
          : [
              "You completed useful practice data",
              "The report identifies concrete weak areas",
              "There is a clear path for the next revision cycle",
            ];

    const weaknesses =
      overall >= 8
        ? [
            "Add more project metrics and trade-offs",
            "Prepare deeper edge-case explanations",
          ]
        : [
            "Some answers need stronger examples",
            "Technical depth can be improved on lower-scored questions",
            "Practice shorter, more confident conclusions",
          ];

    return {
      answered: answered.length,
      total,
      overall,
      best,
      communication,
      confidence,
      technical,
      strengths,
      weaknesses,
      topics: getSuggestedTopics(answered),
      hiringRecommendation:
        overall >= 8
          ? "Recommended for Technical Round 2"
          : overall >= 6.5
            ? "Recommended with focused revision"
            : "Needs another practice round before shortlisting",
    };
  }, [results, serverReport]);

  const downloadReportPdf = () => {
    downloadPdf(`mockpro-interview-report-${id}.pdf`, "MockPro Interview Report", [
      `Candidate: ${user?.name || "Candidate"}`,
      `Overall Score: ${report.overall.toFixed(1)}/10`,
      `Technical Knowledge: ${report.technical.toFixed(1)}/10`,
      `Communication: ${report.communication.toFixed(1)}/10`,
      `Confidence: ${report.confidence.toFixed(1)}/10`,
      `Hiring Recommendation: ${report.hiringRecommendation}`,
      "",
      "Strengths:",
      ...report.strengths.map((item) => `- ${item}`),
      "",
      "Weaknesses:",
      ...report.weaknesses.map((item) => `- ${item}`),
      "",
      "Recommended Topics:",
      ...report.topics.map((item) => `- ${item}`),
    ]);
  };

  const downloadCertificatePdf = () => {
    downloadPdf(`mockpro-certificate-${id}.pdf`, "MockPro Certificate", [
      "This certifies that",
      user?.name || "Candidate",
      "completed an AI mock interview round.",
      `Overall Score: ${report.overall.toFixed(1)}/10`,
      `Hiring Recommendation: ${report.hiringRecommendation}`,
      `Certificate ID: MOCKPRO-${id}`,
      `Issued: ${new Date().toLocaleDateString("en-IN")}`,
    ]);
  };

  const actions = (
    <>
      <button
        className="btn"
        type="button"
        disabled={loading || Boolean(error)}
        onClick={downloadReportPdf}
      >
        PDF report
      </button>
      <button
        className="btn"
        type="button"
        disabled={loading || Boolean(error)}
        onClick={downloadCertificatePdf}
      >
        Certificate
      </button>
      <button className="btn" type="button" onClick={() => navigate("/history")}>
        History
      </button>
      <button
        className="btn primary"
        type="button"
        onClick={() => navigate("/create")}
      >
        New interview
      </button>
    </>
  );

  return (
    <AppShell
      eyebrow="AI feedback report"
      title="Interview results"
      subtitle="Review your score, answer-level feedback, strengths, weak areas, and suggested study topics."
      actions={actions}
    >
      {loading ? (
        <div className="empty-state animate-in">Loading results...</div>
      ) : error ? (
        <div className="empty-state animate-in">{error}</div>
      ) : (
        <>
          <section className="report-grid animate-in">
            <div className="panel score-summary">
              <div
                className="score-ring"
                style={{
                  "--score-angle": `${report.overall * 36}deg`,
                }}
              >
                <strong>{report.overall.toFixed(1)}</strong>
                <small>overall</small>
              </div>

              <div className="score-summary-copy">
                <p className="eyebrow">Round summary</p>
                <h2>Placement readiness snapshot</h2>
                <p>
                  {report.answered} of {report.total} questions evaluated. Best
                  answer score: {report.best.toFixed(1)}/10.
                </p>
              </div>
            </div>

            <div className="panel">
              <h2 className="section-title">Score breakdown</h2>
              <div className="score-list">
                <ScoreLine label="Technical Knowledge" score={report.technical} />
                <ScoreLine label="Communication" score={report.communication} />
                <ScoreLine label="Confidence" score={report.confidence} />
              </div>
            </div>
          </section>

          <section className="grid three report-lists">
            <ReportList title="Strengths" items={report.strengths} />
            <ReportList title="Weaknesses" items={report.weaknesses} />
            <ReportList title="Recommended topics" items={report.topics} />
          </section>

          <section className="panel hiring-panel animate-in">
            <p className="eyebrow">Hiring recommendation</p>
            <h2>{report.hiringRecommendation}</h2>
          </section>

          <section className="panel answer-chart">
            <h2 className="section-title">Question score trend</h2>
            {getAnsweredResults(results).length === 0 ? (
              <div className="empty-state">Submit answers to see a chart.</div>
            ) : (
              <div className="chart-panel compact-chart">
                {getAnsweredResults(results).map((item, index) => {
                  const score = toScore(item.score);

                  return (
                    <div
                      className="chart-bar"
                      key={item.id || index}
                      title={`Question ${index + 1}: ${score}/10`}
                    >
                      <span style={{ height: `${Math.max(score * 18, 10)}px` }} />
                      <span>Q{index + 1}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="grid result-list">
            {results.length === 0 ? (
              <div className="empty-state">No result rows found.</div>
            ) : (
              results.map((item, index) => (
                <article className="result-row" key={item.id || index}>
                  <div className="result-heading">
                    <span className="pill">Question {index + 1}</span>
                    <span className="score-chip">{toScore(item.score)}/10</span>
                  </div>
                  <h3>{item.question}</h3>
                  <p>
                    <strong>Answer:</strong>{" "}
                    {item.answer || "No answer submitted yet."}
                  </p>
                  <p>
                    <strong>Feedback:</strong> {item.feedback || "N/A"}
                  </p>
                </article>
              ))
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

function ScoreLine({ label, score }) {
  return (
    <div className="score-line">
      <div className="score-line-header">
        <span>{label}</span>
        <strong>{score.toFixed(1)}/10</strong>
      </div>
      <StarRating score={score} />
      <div className="progress-track">
        <div
          className="progress-fill green"
          style={{ "--progress": `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

function StarRating({ score }) {
  const filled = Math.round(score / 2);

  return (
    <span className="star-rating" aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span className={index < filled ? "filled" : ""} key={index}>
          {index < filled ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function ReportList({ title, items }) {
  return (
    <div className="panel report-card">
      <h2 className="section-title">{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default Results;
