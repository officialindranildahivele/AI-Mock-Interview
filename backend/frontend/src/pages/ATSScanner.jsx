import { useState } from "react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import API from "../services/api";

function ATSScanner() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  const scanResume = async () => {
    setError("");

    if (!file) {
      setError("Choose a PDF resume before scanning.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("resume", file);

      const res = await API.post("/resume/ats", formData);
      setAnalysis(res.data.analysis);
    } catch (err) {
      setError(err.response?.data?.message || "ATS scan failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      eyebrow="ATS scanner"
      title="Resume ATS score"
      subtitle="Upload a PDF resume and get keyword coverage, skills analysis, missing terms, and concrete improvements."
    >
      <section className="grid two">
        <motion.div
          className="form-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title">Upload resume</h2>

          {error && <p className="error-text">{error}</p>}

          <label className="file-upload" htmlFor="atsResume">
            <span className="file-icon">ATS</span>
            <span>
              <strong>{file ? file.name : "Choose resume PDF"}</strong>
              <small>
                The scanner checks skills, sections, keywords, contact signals,
                and resume length.
              </small>
            </span>
          </label>
          <input
            id="atsResume"
            className="sr-only"
            type="file"
            accept=".pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />

          <button
            className="btn primary"
            type="button"
            disabled={loading}
            onClick={scanResume}
          >
            {loading ? "Scanning..." : "Scan resume"}
          </button>
        </motion.div>

        <motion.aside
          className="panel score-summary"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div
            className="score-ring"
            style={{
              "--score-angle": `${(analysis?.atsScore || 0) * 3.6}deg`,
            }}
          >
            <strong>{analysis?.atsScore || 0}%</strong>
            <small>ATS</small>
          </div>
          <div className="score-summary-copy">
            <p className="eyebrow">Resume readiness</p>
            <h2>{analysis ? "ATS scan complete" : "Waiting for upload"}</h2>
            <p>
              {analysis
                ? `${analysis.skillsFound.length} skills found, ${analysis.missingKeywords.length} keyword gaps, ${analysis.wordCount} words.`
                : "Your resume score and improvement plan will appear here."}
            </p>
          </div>
        </motion.aside>
      </section>

      {analysis && (
        <>
          <section className="grid three report-lists">
            <ReportList title="Skills found" items={analysis.skillsFound} />
            <ReportList title="Missing keywords" items={analysis.missingKeywords} />
            <ReportList title="Suggested improvements" items={analysis.suggestions} />
          </section>

          <section className="panel answer-chart">
            <h2 className="section-title">Skills analysis</h2>
            <div className="score-list">
              {analysis.skillsAnalysis.map((item) => (
                <div className="score-line" key={item.category}>
                  <div className="score-line-header">
                    <span>{item.category}</span>
                    <strong>{item.score}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill green"
                      style={{ "--progress": `${item.score}%` }}
                    />
                  </div>
                  <p className="metric-note">
                    Found: {item.found.length ? item.found.join(", ") : "None"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function ReportList({ title, items }) {
  return (
    <div className="panel report-card">
      <h2 className="section-title">{title}</h2>
      <ul>
        {items.length === 0 ? (
          <li>No gaps found.</li>
        ) : (
          items.map((item) => <li key={item}>{item}</li>)
        )}
      </ul>
    </div>
  );
}

export default ATSScanner;
