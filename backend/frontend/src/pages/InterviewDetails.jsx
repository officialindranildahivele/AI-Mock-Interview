import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

const toScore = (value) => Number(value || 0);

function InterviewDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await API.get(`/interview/${id}`);
        setQuestions(res.data.questions || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load details.");
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [id]);

  const summary = useMemo(() => {
    const answered = questions.filter(
      (question) => question.score !== null && question.score !== undefined
    );
    const total = answered.reduce(
      (sum, question) => sum + toScore(question.score),
      0
    );

    return {
      answered: answered.length,
      total: questions.length,
      average: answered.length === 0 ? 0 : total / answered.length,
    };
  }, [questions]);

  const actions = (
    <>
      <button className="btn" type="button" onClick={() => navigate("/history")}>
        Back to history
      </button>
      <button
        className="btn primary"
        type="button"
        onClick={() => navigate(`/results/${id}`)}
      >
        Results report
      </button>
    </>
  );

  return (
    <AppShell
      eyebrow="Question details"
      title="Interview answer review"
      subtitle="Inspect every question, submitted answer, score, and AI feedback from this saved round."
      actions={actions}
    >
      <section className="grid three animate-in">
        <div className="metric-card">
          <p className="metric-label">Questions</p>
          <p className="metric-value">{summary.total}</p>
          <p className="metric-note">Generated for this round</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Answered</p>
          <p className="metric-value">{summary.answered}</p>
          <p className="metric-note">Evaluated responses</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Average</p>
          <p className="metric-value">{summary.average.toFixed(1)}</p>
          <p className="metric-note">Score out of 10</p>
        </div>
      </section>

      <section className="grid result-list details-list">
        {loading ? (
          <div className="empty-state">Loading interview details...</div>
        ) : error ? (
          <div className="empty-state">{error}</div>
        ) : questions.length === 0 ? (
          <div className="empty-state">No questions found.</div>
        ) : (
          questions.map((question, index) => (
            <article className="result-row" key={question.id || index}>
              <div className="result-heading">
                <span className="pill">Question {index + 1}</span>
                <span className="score-chip">{toScore(question.score)}/10</span>
              </div>
              <h3>{question.question}</h3>
              <p>
                <strong>Answer:</strong>{" "}
                {question.answer || "Not answered yet."}
              </p>
              <p>
                <strong>Feedback:</strong> {question.feedback || "N/A"}
              </p>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}

export default InterviewDetails;
