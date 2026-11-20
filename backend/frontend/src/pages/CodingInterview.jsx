import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { motion } from "framer-motion";
import AppShell from "../components/AppShell";
import API from "../services/api";

const LANGUAGE_OPTIONS = [
  { label: "JavaScript", value: "javascript", monaco: "javascript" },
  { label: "Python", value: "python", monaco: "python" },
  { label: "C++", value: "cpp", monaco: "cpp" },
  { label: "Java", value: "java", monaco: "java" },
];

const TEMPLATES = {
  javascript: `const fs = require("fs");
const [a, b] = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);
console.log(a + b);`,
  python: `import sys

data = list(map(int, sys.stdin.read().strip().split()))
print(data[0] + data[1])`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
  long long a, b;
  cin >> a >> b;
  cout << a + b;
  return 0;
}`,
  java: `import java.util.*;

public class Main {
  public static void main(String[] args) {
    Scanner sc = new Scanner(System.in);
    long a = sc.nextLong();
    long b = sc.nextLong();
    System.out.println(a + b);
  }
}`,
};

const DEFAULT_TESTS = [
  {
    name: "Basic",
    input: "2 3",
    expected: "5",
  },
  {
    name: "Larger numbers",
    input: "100 250",
    expected: "350",
  },
  {
    name: "Negative value",
    input: "-10 7",
    expected: "-3",
  },
];

function CodingInterview() {
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(TEMPLATES.javascript);
  const [tests, setTests] = useState(DEFAULT_TESTS);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedLanguage = useMemo(
    () => LANGUAGE_OPTIONS.find((item) => item.value === language),
    [language]
  );

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    setCode(TEMPLATES[nextLanguage]);
    setResults(null);
    setError("");
  };

  const updateTest = (index, key, value) => {
    setTests((current) =>
      current.map((test, itemIndex) =>
        itemIndex === index
          ? {
              ...test,
              [key]: value,
            }
          : test
      )
    );
  };

  const runCode = async () => {
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await API.post("/coding/run", {
        language,
        code,
        tests,
      });

      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Code execution failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      eyebrow="Coding interview"
      title="Run code against test cases"
      subtitle="Practice coding rounds with Monaco Editor, multiple languages, sample tests, and backend execution."
    >
      <section className="coding-layout">
        <motion.div
          className="panel coding-editor-panel"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="coding-toolbar">
            <div className="segmented-control">
              {LANGUAGE_OPTIONS.map((item) => (
                <button
                  className={item.value === language ? "active" : ""}
                  key={item.value}
                  type="button"
                  onClick={() => changeLanguage(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              className="btn primary"
              type="button"
              disabled={loading}
              onClick={runCode}
            >
              {loading ? "Running..." : "Run tests"}
            </button>
          </div>

          <div className="monaco-frame">
            <Editor
              height="560px"
              language={selectedLanguage?.monaco}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </motion.div>

        <motion.aside
          className="panel coding-side"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="section-title">Problem</h2>
          <p className="metric-note">
            Read two integers from standard input and print their sum.
          </p>

          <h2 className="section-title test-title">Test cases</h2>
          <div className="test-list">
            {tests.map((test, index) => (
              <article className="test-card" key={test.name}>
                <strong>{test.name}</strong>
                <label>
                  Input
                  <textarea
                    className="input test-input"
                    value={test.input}
                    onChange={(event) =>
                      updateTest(index, "input", event.target.value)
                    }
                  />
                </label>
                <label>
                  Expected
                  <input
                    className="input"
                    value={test.expected}
                    onChange={(event) =>
                      updateTest(index, "expected", event.target.value)
                    }
                  />
                </label>
              </article>
            ))}
          </div>
        </motion.aside>
      </section>

      {(error || results) && (
        <section className="panel coding-results">
          <h2 className="section-title">Run output</h2>
          {error && <p className="error-text">{error}</p>}
          {results?.error && <p className="error-text">{results.error}</p>}
          {results?.results?.length > 0 && (
            <div className="result-table">
              {results.results.map((item) => (
                <article
                  className={item.passed ? "test-result passed" : "test-result failed"}
                  key={item.name}
                >
                  <strong>{item.name}</strong>
                  <span>{item.passed ? "Passed" : "Failed"}</span>
                  <p>Expected: {item.expected || "(empty)"}</p>
                  <p>Actual: {item.actual || "(empty)"}</p>
                  {item.stderr && <p>Error: {item.stderr}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}

export default CodingInterview;
