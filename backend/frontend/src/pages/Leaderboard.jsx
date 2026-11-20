import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import API from "../services/api";

const toFixedScore = (value) =>
  Number(value || 0).toFixed(1);

function Leaderboard() {
  const [leaderboard, setLeaderboard] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadLeaderboard =
      async () => {
        setLoading(true);
        setError("");

        try {
          const res =
            await API.get(
              "/user/leaderboard"
            );

          setLeaderboard(
            res.data.leaderboard || []
          );
        } catch (err) {
          setError(
            err.response?.data?.message ||
              "Could not load leaderboard."
          );
        } finally {
          setLoading(false);
        }
      };

    loadLeaderboard();
  }, []);

  const currentUser = useMemo(
    () =>
      leaderboard.find(
        (item) => item.isCurrentUser
      ),
    [leaderboard]
  );

  const topThree =
    leaderboard.slice(0, 3);

  return (
    <AppShell
      eyebrow="Leaderboard"
      title="Candidate rankings"
      subtitle="Compare interview consistency, average score, best score, and completed answers across active candidates."
    >
      {loading ? (
        <div className="empty-state">
          Loading leaderboard...
        </div>
      ) : error ? (
        <div className="empty-state">
          {error}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state">
          No scored interviews yet.
        </div>
      ) : (
        <>
          <section className="grid three leaderboard-podium">
            {topThree.map((item) => (
              <motion.article
                className={
                  item.isCurrentUser
                    ? "metric-card leaderboard-highlight"
                    : "metric-card"
                }
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="metric-label">
                  Rank #{item.rank}
                </p>
                <p className="leaderboard-name">
                  {item.name}
                </p>
                <p className="metric-value">
                  {toFixedScore(
                    item.averageScore
                  )}
                </p>
                <p className="metric-note">
                  {item.interviews} interviews,
                  {" "}
                  {item.answeredQuestions} answers
                </p>
              </motion.article>
            ))}
          </section>

          {currentUser && (
            <section className="panel leaderboard-current">
              <div>
                <p className="eyebrow">
                  Your position
                </p>
                <h2 className="section-title">
                  Rank #{currentUser.rank}
                </h2>
              </div>
              <div className="grid three">
                <MiniMetric
                  label="Average"
                  value={toFixedScore(
                    currentUser.averageScore
                  )}
                />
                <MiniMetric
                  label="Best"
                  value={toFixedScore(
                    currentUser.bestScore
                  )}
                />
                <MiniMetric
                  label="Answers"
                  value={
                    currentUser.answeredQuestions
                  }
                />
              </div>
            </section>
          )}

          <section className="panel leaderboard-table">
            <h2 className="section-title">
              Top candidates
            </h2>

            <div className="leaderboard-page-list">
              {leaderboard.map((item) => (
                <article
                  className={
                    item.isCurrentUser
                      ? "leaderboard-page-row current"
                      : "leaderboard-page-row"
                  }
                  key={item.id}
                >
                  <span className="rank-badge">
                    #{item.rank}
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.interviews} interviews
                      {" "}
                      | {item.answeredQuestions} answers
                    </p>
                  </div>
                  <div className="leaderboard-scores">
                    <b>
                      {toFixedScore(
                        item.averageScore
                      )}
                    </b>
                    <small>
                      best{" "}
                      {toFixedScore(
                        item.bestScore
                      )}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="metric-card compact">
      <p className="metric-label">
        {label}
      </p>
      <p className="metric-value">
        {value}
      </p>
    </div>
  );
}

export default Leaderboard;
