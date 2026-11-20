import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

function ResumeInterview() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [questions, setQuestions] = useState([]);
  const [interview, setInterview] = useState(null);
  const [error, setError] = useState("");

  const uploadResume = async () => {
    setError("");

    if (!file) {
      setError("Choose a PDF resume before uploading.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("resume", file);

      const res = await API.post("/resume/upload", formData);

      setResumeText(res.data.text || "");
      setQuestions(res.data.questions || []);
      setInterview(res.data.interview || null);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Resume upload failed.";

      setError(
        message === "AI response must be a JSON array"
          ? "Backend is still running old code. Stop the backend with Ctrl+C, run npm start again, then upload the resume."
          : message
      );
    } finally {
      setLoading(false);
    }
  };

  const startInterview = () => {
    if (!interview?.id || questions.length === 0) {
      setError("Upload a resume and generate questions first.");
      return;
    }

    localStorage.setItem("interviewId", interview.id);
    localStorage.setItem("questions", JSON.stringify(questions));

    navigate(`/interview/${interview.id}`);
  };

  const actions = (
    <button
      className="btn"
      type="button"
      onClick={() => navigate("/dashboard")}
    >
      Dashboard
    </button>
  );

  return (
    <AppShell
      eyebrow="Resume interview"
      title="Generate questions from your resume"
      subtitle="Upload a PDF resume, review the extracted content, and start an AI interview based on your actual profile."
      actions={actions}
    >
      <section className="grid two">
        <div className="form-panel animate-in">
          <h2 className="section-title">Upload resume</h2>

          {error && <p className="error-text">{error}</p>}

          <label className="file-upload" htmlFor="resume">
            <span className="file-icon">PDF</span>
            <span>
              <strong>{file ? file.name : "Choose resume PDF"}</strong>
              <small>
                The backend extracts text and creates a saved interview round.
              </small>
            </span>
          </label>
          <input
            id="resume"
            className="sr-only"
            type="file"
            accept=".pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />

          <div className="button-row">
            <button
              className="btn primary"
              type="button"
              disabled={loading}
              onClick={uploadResume}
            >
              {loading ? "Generating..." : "Upload and generate"}
            </button>
            <button
              className="btn success"
              type="button"
              disabled={questions.length === 0}
              onClick={startInterview}
            >
              Start interview
            </button>
          </div>
        </div>

        <aside className="panel animate-in">
          <h2 className="section-title">Generated questions</h2>
          {questions.length === 0 ? (
            <div className="empty-state">
              Resume-based questions will appear here after upload.
            </div>
          ) : (
            <div className="question-list">
              {questions.map((item, index) => (
                <article className="mini-question" key={item.id || index}>
                  <span>Q{index + 1}</span>
                  <p>{item.question || item}</p>
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      {resumeText && (
        <section className="panel resume-section animate-in">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Extracted content</p>
              <h2 className="section-title">Resume text preview</h2>
            </div>
            <span className="pill">{resumeText.length} characters</span>
          </div>
          <pre className="resume-preview">{resumeText}</pre>
        </section>
      )}
    </AppShell>
  );
}

export default ResumeInterview;
