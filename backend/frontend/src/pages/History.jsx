import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

const toScore = (value) => Number(value || 0);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Recent";

function History() {
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await API.get("/interview/history");
        setInterviews(res.data.interviews || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const actions = (
    <button
      className="btn primary"
      type="button"
      onClick={() => navigate("/create")}
    >
      New interview
    </button>
  );

  return (
    <AppShell
      eyebrow="Interview history"
      title="Saved practice rounds"
      subtitle="Scan previous interviews, open detailed feedback, and continue improving from the same score record."
      actions={actions}
    >
      {loading ? (
        <div className="empty-state animate-in">Loading history...</div>
      ) : error ? (
        <div className="empty-state animate-in">{error}</div>
      ) : interviews.length === 0 ? (
        <div className="empty-state animate-in">
          No interviews yet. Create a round to start tracking progress.
        </div>
      ) : (
        <section className="grid history-grid animate-in">
          {interviews.map((item) => {
            const score = toScore(item.average_score);
            const answered = Number(item.answered_questions || 0);
            const total = Number(item.total_questions || 0);

            return (
              <article className="interview-card history-card" key={item.id}>
                <div className="history-card-header">
                  <div>
                    <p className="eyebrow">{formatDate(item.created_at)}</p>
                    <h2>{item.role}</h2>
                  </div>
                  <span className="score-chip">{score.toFixed(1)}/10</span>
                </div>

                <div className="meta-list">
                  <span className="pill">{item.experience || 0} years</span>
                  <span className="pill">{answered}/{total} answered</span>
                </div>

                <p className="history-stack">{item.tech_stack}</p>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ "--progress": `${score * 10}%` }}
                  />
                </div>

                <div className="button-row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => navigate(`/interview-details/${item.id}`)}
                  >
                    Details
                  </button>
                  <button
                    className="btn primary"
                    type="button"
                    onClick={() => navigate(`/results/${item.id}`)}
                  >
                    Results
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

export default History;
