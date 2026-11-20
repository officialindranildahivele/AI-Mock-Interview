import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import API from "../services/api";

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAdmin = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await API.get("/admin/overview");
        setOverview(res.data.overview);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load admin data.");
      } finally {
        setLoading(false);
      }
    };

    loadAdmin();
  }, []);

  return (
    <AppShell
      eyebrow="Admin panel"
      title="Platform analytics"
      subtitle="Track users, interviews, leaderboard, common mistakes, and AI usage statistics."
    >
      {loading ? (
        <div className="empty-state">Loading admin dashboard...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : (
        <>
          <section className="grid four">
            <Metric label="Users" value={overview.totalUsers} note="Registered accounts" />
            <Metric label="Interviews" value={overview.totalInterviews} note="Created sessions" />
            <Metric label="Answers" value={overview.totalAnswers} note="AI evaluations" />
            <Metric label="Average" value={overview.averageScore} note="Global score" />
          </section>

          <section className="grid two admin-grid">
            <motion.div
              className="panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="section-title">Leaderboard</h2>
              <div className="leaderboard-list">
                {overview.leaderboard.map((item, index) => (
                  <article className="leaderboard-row" key={item.email}>
                    <span>#{index + 1}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.interviews} interviews</p>
                    </div>
                    <b>{Number(item.average_score || 0).toFixed(1)}</b>
                  </article>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="panel"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <h2 className="section-title">Most common mistakes</h2>
              <div className="grid">
                {overview.commonMistakes.length === 0 ? (
                  <div className="empty-state">No answer feedback yet.</div>
                ) : (
                  overview.commonMistakes.map((item) => (
                    <article className="mistake-row" key={item.feedback}>
                      <p>{item.feedback}</p>
                      <span>{item.count}x</span>
                    </article>
                  ))
                )}
              </div>
            </motion.div>
          </section>

          <section className="panel admin-grid">
            <h2 className="section-title">AI usage statistics</h2>
            <div className="grid two">
              <div className="metric-card compact">
                <p className="metric-label">Generated questions</p>
                <p className="metric-value">{overview.aiUsage.generatedQuestions}</p>
                <p className="metric-note">Stored question rows</p>
              </div>
              <div className="metric-card compact">
                <p className="metric-label">Evaluated answers</p>
                <p className="metric-value">{overview.aiUsage.evaluatedAnswers}</p>
                <p className="metric-note">Saved feedback rows</p>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function Metric({ label, value, note }) {
  return (
    <motion.div
      className="metric-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-note">{note}</p>
    </motion.div>
  );
}

export default AdminDashboard;
