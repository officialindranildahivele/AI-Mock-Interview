import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

const STACK_PRESETS = [
  "Java, OOP, DBMS, SQL, Collections",
  "React, JavaScript, Node.js, APIs, PostgreSQL",
  "Python, DSA, DBMS, Operating Systems, Projects",
];

function VoiceInterview() {
  const navigate = useNavigate();

  const [role, setRole] = useState("Software Engineer");
  const [experience, setExperience] = useState(0);
  const [techStack, setTechStack] = useState(STACK_PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startVoiceRound = async (event) => {
    event.preventDefault();
    setError("");

    if (!role.trim() || !techStack.trim()) {
      setError("Role and tech stack are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/interview/create", {
        role,
        experience,
        techStack,
      });

      localStorage.setItem("interviewId", res.data.interview.id);
      localStorage.setItem("questions", JSON.stringify(res.data.questions));

      navigate(`/interview/${res.data.interview.id}?mode=voice`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start voice round.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      eyebrow="Voice interview"
      title="Start a spoken AI round"
      subtitle="Create a saved interview and answer with your microphone using speech-to-text, AI evaluation, and optional auto submit."
    >
      <section className="grid two">
        <form className="form-panel animate-in" onSubmit={startVoiceRound}>
          <h2 className="section-title">Voice round setup</h2>

          {error && <p className="error-text">{error}</p>}

          <div className="field-group">
            <label htmlFor="voiceRole">Target role</label>
            <input
              id="voiceRole"
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="voiceExperience">Experience in years</label>
            <input
              id="voiceExperience"
              className="input"
              type="number"
              min="0"
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="voiceStack">Tech stack</label>
            <textarea
              id="voiceStack"
              className="textarea"
              value={techStack}
              onChange={(event) => setTechStack(event.target.value)}
            />
          </div>

          <div className="segmented-control preset-control">
            {STACK_PRESETS.map((preset) => (
              <button
                className={preset === techStack ? "active" : ""}
                key={preset}
                type="button"
                onClick={() => setTechStack(preset)}
              >
                {preset.split(",")[0]}
              </button>
            ))}
          </div>

          <div className="button-row">
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Generating..." : "Start voice interview"}
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => navigate("/camera")}
            >
              Camera practice
            </button>
          </div>
        </form>

        <aside className="panel animate-in">
          <h2 className="section-title">Voice flow</h2>
          <div className="feature-stack">
            <div className="feature-row">
              <span className="feature-icon">MIC</span>
              <div>
                <strong>Microphone answer capture</strong>
                <p>Browser speech recognition fills the answer box.</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-icon">AI</span>
              <div>
                <strong>AI evaluation</strong>
                <p>Each spoken answer is scored and saved.</p>
              </div>
            </div>
            <div className="feature-row">
              <span className="feature-icon">GO</span>
              <div>
                <strong>Auto submit mode</strong>
                <p>Submit automatically when speech recognition ends.</p>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export default VoiceInterview;
