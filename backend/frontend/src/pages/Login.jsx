import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] =
    useState("");
  const [loading, setLoading] =
    useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError(
        "Email and password are required."
      );
      return;
    }

    try {
      setLoading(true);

      const res =
        await API.post(
          "/auth/login",
          {
            email,
            password,
          }
        );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(
          res.data.user
        )
      );

      navigate("/dashboard");

    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please try again."
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
            Placement-ready practice
          </p>
          <h1>
            Train with AI interviews,
            review your progress, and
            improve every round.
          </h1>
          <p>
            A focused interview workspace
            for resume-based questions,
            technical answers, feedback,
            scores, and history.
          </p>
        </div>

        <p className="metric-note">
          Built with React, Node.js,
          PostgreSQL, JWT, and AI
          evaluation.
        </p>
      </section>

      <section className="auth-panel">
        <form
          className="panel animate-in"
          onSubmit={handleLogin}
        >
          <p className="eyebrow">
            Welcome back
          </p>
          <h2 className="section-title">
            Sign in to continue
          </h2>

          {error && (
            <p className="error-text">
              {error}
            </p>
          )}

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
              placeholder="Enter password"
            />
          </div>

          <div className="button-row">
            <button
              className="btn primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() =>
                navigate("/register")
              }
            >
              Create account
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default Login;
