import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "../components/AppShell";
import API from "../services/api";

const CHART_COLORS = [
  "#38d7e8",
  "#5ee08b",
  "#f7c948",
  "#ff6b8a",
  "#a78bfa",
  "#8bd3ff",
];

const toNumber = (value) =>
  Number(value || 0);

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      )
    : "Recent";

const formatChartDate = (date) =>
  date
    ? new Date(date).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
        }
      )
    : "Round";

const splitSkills = (value = "") =>
  value
    .split(/[,|/]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

function Dashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const [interviews, setInterviews] =
    useState([]);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadDashboard =
      async () => {
        try {
          const res =
            await API.get(
              "/interview/history"
            );

          setInterviews(
            res.data.interviews || []
          );
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      };

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const scored =
      interviews.filter(
        (item) =>
          toNumber(
            item.answered_questions
          ) > 0
      );

    const average =
      scored.length === 0
        ? 0
        : scored.reduce(
            (sum, item) =>
              sum +
              toNumber(
                item.average_score
              ),
            0
          ) / scored.length;

    const best =
      scored.reduce(
        (max, item) =>
          Math.max(
            max,
            toNumber(
              item.average_score
            )
          ),
        0
      );

    const skillCounts = new Map();

    interviews.forEach((item) => {
      splitSkills(item.tech_stack).forEach((skill) => {
        const key = skill.toLowerCase();
        const current =
          skillCounts.get(key) || {
            name: skill,
            value: 0,
          };

        skillCounts.set(key, {
          ...current,
          value: current.value + 1,
        });
      });
    });

    const today = new Date();
    const weeklyPractice = Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(today);
        date.setDate(
          today.getDate() - (6 - index)
        );

        return {
          key: date.toDateString(),
          day: date.toLocaleDateString(
            "en-IN",
            {
              weekday: "short",
            }
          ),
          interviews: 0,
        };
      }
    );

    interviews.forEach((item) => {
      const date = item.created_at
        ? new Date(item.created_at)
        : null;

      if (!date) {
        return;
      }

      const day = weeklyPractice.find(
        (entry) =>
          entry.key ===
          date.toDateString()
      );

      if (day) {
        day.interviews += 1;
      }
    });

    return {
      total: interviews.length,
      average,
      best,
      answered: scored.length,
      recent:
        interviews.slice(0, 4),
      trend:
        scored
          .slice(0, 8)
          .reverse()
          .map((item, index) => ({
            name:
              formatChartDate(
                item.created_at
              ) || `Round ${index + 1}`,
            score: toNumber(
              item.average_score
            ),
            role:
              item.role || `Round ${index + 1}`,
          })),
      skillDistribution:
        Array.from(skillCounts.values())
          .sort((a, b) => b.value - a.value)
          .slice(0, 6),
      weeklyPractice,
    };
  }, [interviews]);

  const actions = (
    <>
      <button
        className="btn primary"
        type="button"
        onClick={() =>
          navigate("/create")
        }
      >
        New interview
      </button>
      <button
        className="btn"
        type="button"
        onClick={() =>
          navigate("/voice")
        }
      >
        Voice round
      </button>
      <button
        className="btn"
        type="button"
        onClick={() =>
          navigate("/ats")
        }
      >
        ATS scan
      </button>
    </>
  );

  return (
    <AppShell
      eyebrow="Dashboard"
      title={`Welcome, ${
        user?.name || "Candidate"
      }`}
      subtitle="Track interview practice, scores, skills, weekly activity, and recent sessions from one focused workspace."
      actions={actions}
    >
      <section className="grid four animate-in">
        <div className="metric-card">
          <p className="metric-label">
            Total interviews
          </p>
          <p className="metric-value">
            {loading
              ? "--"
              : stats.total}
          </p>
          <p className="metric-note">
            Saved practice rounds
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">
            Average score
          </p>
          <p className="metric-value">
            {stats.average.toFixed(1)}
          </p>
          <p className="metric-note">
            Across completed rounds
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">
            Best score
          </p>
          <p className="metric-value">
            {stats.best.toFixed(1)}
          </p>
          <p className="metric-note">
            Highest interview average
          </p>
        </div>

        <div className="metric-card">
          <p className="metric-label">
            Completed
          </p>
          <p className="metric-value">
            {stats.answered}
          </p>
          <p className="metric-note">
            Interviews with answers
          </p>
        </div>
      </section>

      <section className="analytics-grid">
        <ChartPanel title="Interview score trend">
          {stats.trend.length === 0 ? (
            <ChartEmpty text="No scored interviews yet." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.trend}>
                <CartesianGrid stroke="rgba(226,232,240,0.1)" vertical={false} />
                <XAxis dataKey="name" stroke="#9aa6b8" tickLine={false} />
                <YAxis domain={[0, 10]} stroke="#9aa6b8" tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#38d7e8"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: "#38d7e8",
                    stroke: "#0c0f14",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>

        <ChartPanel title="Skill distribution">
          {stats.skillDistribution.length === 0 ? (
            <ChartEmpty text="Create rounds with a tech stack." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Tooltip content={<ChartTooltip />} />
                  <Pie
                    data={stats.skillDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={86}
                    paddingAngle={3}
                  >
                    {stats.skillDistribution.map((entry, index) => (
                      <Cell
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        key={entry.name}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="skill-legend">
                {stats.skillDistribution.map((entry, index) => (
                  <span key={entry.name}>
                    <i
                      style={{
                        background:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    {entry.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartPanel>

        <ChartPanel title="Weekly practice">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.weeklyPractice}>
              <CartesianGrid stroke="rgba(226,232,240,0.1)" vertical={false} />
              <XAxis dataKey="day" stroke="#9aa6b8" tickLine={false} />
              <YAxis allowDecimals={false} stroke="#9aa6b8" tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="interviews" radius={[6, 6, 0, 0]} fill="#5ee08b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </section>

      <section className="panel recent-panel animate-in">
        <h2 className="section-title">
          Recent interviews
        </h2>

        {stats.recent.length === 0 ? (
          <div className="empty-state">
            Create your first interview.
          </div>
        ) : (
          <div className="grid two">
            {stats.recent.map(
              (item) => {
                const score =
                  toNumber(
                    item.average_score
                  );

                return (
                  <article
                    className="interview-card"
                    key={item.id}
                  >
                    <div>
                      <h3>{item.role}</h3>
                      <p className="metric-note">
                        {formatDate(
                          item.created_at
                        )}
                      </p>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          "--progress":
                            `${score * 10}%`,
                        }}
                      />
                    </div>

                    <div className="button-row">
                      <button
                        className="btn"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/interview/${item.id}`
                          )
                        }
                      >
                        Resume
                      </button>
                      <button
                        className="btn primary"
                        type="button"
                        onClick={() =>
                          navigate(
                            `/results/${item.id}`
                          )
                        }
                      >
                        View results
                      </button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="panel chart-card animate-in">
      <h2 className="section-title">
        {title}
      </h2>
      <div className="chart-shell">
        {children}
      </div>
    </div>
  );
}

function ChartEmpty({ text }) {
  return (
    <div className="chart-empty">
      {text}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];

  return (
    <div className="chart-tooltip">
      <strong>{label || item.name}</strong>
      <span>
        {item.name}: {item.value}
      </span>
    </div>
  );
}

export default Dashboard;
