import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

function CreateInterview() {
  const navigate = useNavigate();

  const [role, setRole] =
    useState("");
  const [experience, setExperience] =
    useState(0);
  const [techStack, setTechStack] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const createInterview =
    async (event) => {
      event.preventDefault();
      setError("");

      if (!role || !techStack) {
        setError(
          "Role and tech stack are required."
        );
        return;
      }

      try {
        setLoading(true);

        const res =
          await API.post(
            "/interview/create",
            {
              role,
              experience,
              techStack,
            }
          );

        localStorage.setItem(
          "interviewId",
          res.data.interview.id
        );

        localStorage.setItem(
          "questions",
          JSON.stringify(
            res.data.questions
          )
        );

        navigate(
          `/interview/${res.data.interview.id}`
        );

      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Failed to create interview."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <AppShell
      eyebrow="Interview setup"
      title="Create a technical round"
      subtitle="Generate role-specific questions and start a saved interview session."
    >
      <section className="grid two">
        <form
          className="form-panel animate-in"
          onSubmit={createInterview}
        >
          <h2 className="section-title">
            Interview details
          </h2>

          {error && (
            <p className="error-text">
              {error}
            </p>
          )}

          <div className="field-group">
            <label htmlFor="role">
              Target role
            </label>
            <input
              id="role"
              className="input"
              placeholder="Frontend Developer"
              value={role}
              onChange={(event) =>
                setRole(
                  event.target.value
                )
              }
            />
          </div>

          <div className="field-group">
            <label htmlFor="experience">
              Experience in years
            </label>
            <input
              id="experience"
              className="input"
              type="number"
              min="0"
              value={experience}
              onChange={(event) =>
                setExperience(
                  event.target.value
                )
              }
            />
          </div>

          <div className="field-group">
            <label htmlFor="techStack">
              Tech stack
            </label>
            <textarea
              id="techStack"
              className="textarea"
              placeholder="React, Node.js, PostgreSQL, JavaScript"
              value={techStack}
              onChange={(event) =>
                setTechStack(
                  event.target.value
                )
              }
            />
          </div>

          <div className="button-row">
            <button
              className="btn primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Generating..."
                : "Generate questions"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                navigate("/dashboard")
              }
            >
              Cancel
            </button>
          </div>
        </form>

        <aside className="panel animate-in">
          <h2 className="section-title">
            Session profile
          </h2>

          <div className="grid">
            <div className="metric-card">
              <p className="metric-label">
                Question set
              </p>
              <p className="metric-value">
                10
              </p>
              <p className="metric-note">
                AI-generated technical questions
              </p>
            </div>

            <div className="metric-card">
              <p className="metric-label">
                Evaluation
              </p>
              <p className="metric-value">
                /10
              </p>
              <p className="metric-note">
                Each answer receives a score and feedback
              </p>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export default CreateInterview;
