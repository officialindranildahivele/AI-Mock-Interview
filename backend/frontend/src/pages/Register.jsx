import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Register() {
  const navigate = useNavigate();

  const [name, setName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  const handleRegister =
    async (event) => {
      event.preventDefault();
      setError("");
      setSuccess("");

      if (
        !name ||
        !email ||
        !password
      ) {
        setError(
          "Name, email, and password are required."
        );
        return;
      }

      try {
        setLoading(true);

        await API.post(
          "/auth/register",
          {
            name,
            email,
            password,
          }
        );

        setSuccess(
          "Account created. You can sign in now."
        );

        setTimeout(() => {
          navigate("/");
        }, 700);

      } catch (err) {
        setError(
          err.response
            ? err.response.data?.message ||
            "Registration failed. Please try again."
            : "Backend server is not running. Start the backend on port 8000 and try again."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <button
          className="brand"
          type="button"
          onClick={() => navigate("/")}
        >
          <span className="brand-mark">
            AI
          </span>
          <span>
            <strong>MockPro</strong>
            <small>Interview Studio</small>
          </span>
        </button>

        <div>
          <p className="eyebrow">
            Build your interview record
          </p>
          <h1>
            Create a profile and turn
            every practice round into
            measurable progress.
          </h1>
          <p>
            Save interviews, answers,
            feedback, resume rounds, and
            scores in one placement
            preparation dashboard.
          </p>
        </div>

        <p className="metric-note">
          Designed for repeated practice
          and recruiter-ready demos.
        </p>
      </section>

      <section className="auth-panel">
        <form
          className="panel animate-in"
          onSubmit={handleRegister}
        >
          <p className="eyebrow">
            New account
          </p>
          <h2 className="section-title">
            Start practicing
          </h2>

          {error && (
            <p className="error-text">
              {error}
            </p>
          )}
          {success && (
            <p className="success-text">
              {success}
            </p>
          )}

          <div className="field-group">
            <label htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Your name"
            />
          </div>

          <div className="field-group">
            <label htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Create password"
            />
          </div>

          <div className="button-row">
            <button
              className="btn primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create account"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                navigate("/")
              }
            >
              Back to login
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Register;
