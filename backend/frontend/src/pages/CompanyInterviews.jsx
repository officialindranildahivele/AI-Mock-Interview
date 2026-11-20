import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";

const COMPANIES = [
  {
    name: "Microsoft",
    focus: "DSA, system design, product thinking",
    stack: "Data structures, algorithms, operating systems, cloud, APIs",
  },
  {
    name: "Google",
    focus: "Algorithms, problem solving, scalability",
    stack: "Algorithms, complexity, distributed systems, clean code",
  },
  {
    name: "Amazon",
    focus: "Leadership principles, DSA, backend depth",
    stack: "Java, databases, system design, behavioral examples",
  },
  {
    name: "TCS",
    focus: "Fundamentals, aptitude, project explanation",
    stack: "OOP, DBMS, SQL, Java, SDLC",
  },
  {
    name: "Infosys",
    focus: "Core CS, programming basics, communication",
    stack: "Java, Python, DBMS, OOP, operating systems",
  },
  {
    name: "Capgemini",
    focus: "Scenario questions, projects, fundamentals",
    stack: "SQL, JavaScript, Java, cloud basics, communication",
  },
  {
    name: "JPMorgan",
    focus: "Backend, data, reliability, finance systems",
    stack: "Java, SQL, APIs, microservices, data structures",
  },
  {
    name: "Deloitte",
    focus: "Consulting communication and practical engineering",
    stack: "React, Node.js, SQL, cloud, project delivery",
  },
];

function CompanyInterviews() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("Software Engineer");
  const [experience, setExperience] = useState(0);
  const [loadingCompany, setLoadingCompany] = useState("");
  const [error, setError] = useState("");

  const startCompanyRound = async (company) => {
    setError("");
    setLoadingCompany(company.name);

    try {
      const res = await API.post("/interview/create", {
        role: selectedRole,
        experience,
        techStack: company.stack,
        company: company.name,
      });

      localStorage.setItem("interviewId", res.data.interview.id);
      localStorage.setItem("questions", JSON.stringify(res.data.questions));

      navigate(`/interview/${res.data.interview.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start company round.");
    } finally {
      setLoadingCompany("");
    }
  };

  return (
    <AppShell
      eyebrow="Company interviews"
      title="Practice company-specific rounds"
      subtitle="Choose a target company and generate questions shaped around its expected interview style."
    >
      <section className="panel company-setup">
        <div className="field-group">
          <label htmlFor="companyRole">Target role</label>
          <input
            id="companyRole"
            className="input"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
          />
        </div>
        <div className="field-group">
          <label htmlFor="companyExperience">Experience in years</label>
          <input
            id="companyExperience"
            className="input"
            type="number"
            min="0"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
          />
        </div>
      </section>

      {error && <p className="error-text spaced-error">{error}</p>}

      <section className="grid four company-grid">
        {COMPANIES.map((company, index) => (
          <motion.article
            className="company-card"
            key={company.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div>
              <p className="eyebrow">{company.focus}</p>
              <h2>{company.name}</h2>
              <p>{company.stack}</p>
            </div>

            <button
              className="btn primary"
              type="button"
              disabled={Boolean(loadingCompany)}
              onClick={() => startCompanyRound(company)}
            >
              {loadingCompany === company.name ? "Generating..." : "Start round"}
            </button>
          </motion.article>
        ))}
      </section>
    </AppShell>
  );
}

export default CompanyInterviews;
