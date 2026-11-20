const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {
  spawn,
} = require("child_process");

const RUN_TIMEOUT_MS =
  Number(process.env.CODE_RUNNER_TIMEOUT_MS) ||
  5000;
const MAX_CODE_BYTES =
  Number(process.env.CODE_RUNNER_MAX_CODE_BYTES) ||
  24000;
const MAX_TESTS =
  Number(process.env.CODE_RUNNER_MAX_TESTS) ||
  6;
const MAX_TEST_INPUT_BYTES =
  Number(process.env.CODE_RUNNER_MAX_TEST_INPUT_BYTES) ||
  8000;
const MAX_OUTPUT_BYTES =
  Number(process.env.CODE_RUNNER_MAX_OUTPUT_BYTES) ||
  12000;

const DOCKER_MEMORY =
  process.env.CODE_RUNNER_DOCKER_MEMORY ||
  "256m";
const DOCKER_CPUS =
  process.env.CODE_RUNNER_DOCKER_CPUS ||
  "0.5";
const DOCKER_PIDS =
  process.env.CODE_RUNNER_DOCKER_PIDS ||
  "64";

const LANGUAGE_CONFIG = {
  javascript: {
    file: "main.js",
    local: {
      run: [
        "node",
        ["--no-warnings", "main.js"],
      ],
    },
    docker: {
      image:
        process.env.CODE_RUNNER_NODE_IMAGE ||
        "node:22-alpine",
      run: "node --no-warnings main.js",
    },
  },
  python: {
    file: "main.py",
    local: {
      run: ["python3", ["main.py"]],
    },
    docker: {
      image:
        process.env.CODE_RUNNER_PYTHON_IMAGE ||
        "python:3.12-alpine",
      run: "python main.py",
    },
  },
  cpp: {
    file: "main.cpp",
    local: {
      compile: [
        "g++",
        [
          "main.cpp",
          "-std=c++17",
          "-O2",
          "-o",
          "main",
        ],
      ],
      run: ["./main", []],
    },
    docker: {
      image:
        process.env.CODE_RUNNER_CPP_IMAGE ||
        "gcc:14",
      compile:
        "g++ main.cpp -std=c++17 -O2 -o main",
      run: "./main",
    },
  },
  java: {
    file: "Main.java",
    local: {
      compile: ["javac", ["Main.java"]],
      run: ["java", ["Main"]],
    },
    docker: {
      image:
        process.env.CODE_RUNNER_JAVA_IMAGE ||
        "eclipse-temurin:21-jdk",
      compile: "javac Main.java",
      run: "java Main",
    },
  },
};

const byteLength = (value = "") =>
  Buffer.byteLength(String(value), "utf8");

const normalizeOutput = (value = "") =>
  value.trim().replace(/\r\n/g, "\n");

const getRunnerMode = () => {
  const configured =
    String(process.env.CODE_RUNNER_MODE || "")
      .trim()
      .toLowerCase();

  if (configured) {
    return configured;
  }

  return process.env.NODE_ENV === "production"
    ? "disabled"
    : "local";
};

const getLocalEnv = (cwd) => ({
  PATH:
    process.env.PATH ||
    "/usr/local/bin:/usr/bin:/bin",
  HOME: cwd,
  TMPDIR: cwd,
  TMP: cwd,
  TEMP: cwd,
  PYTHONIOENCODING: "utf-8",
  PYTHONNOUSERSITE: "1",
});

const killProcess = (
  child,
  {
    detached,
    containerName,
  } = {}
) => {
  try {
    if (
      detached &&
      process.platform !== "win32" &&
      child.pid
    ) {
      process.kill(-child.pid, "SIGKILL");
    } else {
      child.kill("SIGKILL");
    }
  } catch {
    // Process may have already exited.
  }

  if (containerName) {
    const cleanup =
      spawn(
        "docker",
        ["rm", "-f", containerName],
        {
          stdio: "ignore",
          env: process.env,
        }
      );
    cleanup.unref();
  }
};

const trimToOutputLimit = (value = "") => {
  if (byteLength(value) <= MAX_OUTPUT_BYTES) {
    return value;
  }

  return `${Buffer.from(value)
    .subarray(0, MAX_OUTPUT_BYTES)
    .toString()}...`;
};

const runProcess = (
  command,
  args,
  input,
  cwd,
  options = {}
) =>
  new Promise((resolve) => {
    const detached =
      options.detached ??
      process.platform !== "win32";
    const child =
      spawn(command, args, {
        cwd,
        shell: false,
        stdio: [
          "pipe",
          "pipe",
          "pipe",
        ],
        detached,
        env:
          options.env ||
          getLocalEnv(cwd),
      });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    let outputExceeded = false;

    const finish = (payload) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(payload);
      }
    };

    const appendOutput = (
      target,
      chunk
    ) => {
      const next =
        target === "stdout"
          ? stdout + chunk.toString()
          : stderr + chunk.toString();

      if (
        byteLength(next) >
        MAX_OUTPUT_BYTES
      ) {
        outputExceeded = true;
        if (target === "stdout") {
          stdout =
            trimToOutputLimit(next);
        } else {
          stderr =
            trimToOutputLimit(next);
        }

        killProcess(child, {
          detached,
          containerName:
            options.containerName,
        });
        return;
      }

      if (target === "stdout") {
        stdout = next;
      } else {
        stderr = next;
      }
    };

    const timer =
      setTimeout(() => {
        timedOut = true;
        killProcess(child, {
          detached,
          containerName:
            options.containerName,
        });
      }, options.timeoutMs || RUN_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      appendOutput("stdout", chunk);
    });

    child.stderr.on("data", (chunk) => {
      appendOutput("stderr", chunk);
    });

    child.on("error", (error) => {
      finish({
        success: false,
        stdout,
        stderr: error.message,
      });
    });

    child.on("close", (code, signal) => {
      const timeoutMessage =
        timedOut
          ? `Timed out after ${RUN_TIMEOUT_MS}ms.`
          : "";
      const outputMessage =
        outputExceeded
          ? "Output limit exceeded."
          : "";
      const nextStderr =
        [
          stderr,
          timeoutMessage,
          outputMessage,
        ]
          .filter(Boolean)
          .join("\n");

      finish({
        success:
          code === 0 &&
          !timedOut &&
          !outputExceeded,
        stdout,
        stderr: nextStderr,
        code,
        signal,
        timedOut,
      });
    });

    child.stdin.on("error", () => {});
    child.stdin.end(input || "");
  });

const createDockerArgs = ({
  image,
  command,
  workDir,
  containerName,
}) => [
  "run",
  "--rm",
  "--name",
  containerName,
  "--network",
  "none",
  "--cpus",
  DOCKER_CPUS,
  "--memory",
  DOCKER_MEMORY,
  "--memory-swap",
  DOCKER_MEMORY,
  "--pids-limit",
  DOCKER_PIDS,
  "--cap-drop",
  "ALL",
  "--security-opt",
  "no-new-privileges",
  "--read-only",
  "--tmpfs",
  "/tmp:rw,noexec,nosuid,size=64m",
  "-v",
  `${workDir}:/workspace:rw`,
  "-w",
  "/workspace",
  image,
  "sh",
  "-lc",
  command,
];

const runDockerCommand = (
  dockerConfig,
  command,
  input,
  workDir
) => {
  const containerName =
    `mockpro-${crypto.randomUUID()}`;

  return runProcess(
    "docker",
    createDockerArgs({
      image: dockerConfig.image,
      command,
      workDir,
      containerName,
    }),
    input,
    workDir,
    {
      detached: false,
      env: process.env,
      containerName,
    }
  );
};

const runSubmissionCommand = (
  mode,
  config,
  phase,
  input,
  workDir
) => {
  if (mode === "docker") {
    const command =
      config.docker[phase];

    return runDockerCommand(
      config.docker,
      command,
      input,
      workDir
    );
  }

  const [command, args] =
    config.local[phase];

  return runProcess(
    command,
    args,
    input,
    workDir
  );
};

const validateRunnerMode = (mode) => {
  if (mode === "disabled") {
    const error = new Error(
      "Code execution is disabled in production. Set CODE_RUNNER_MODE=docker to enable sandboxed execution."
    );
    error.statusCode = 503;
    throw error;
  }

  if (!["local", "docker"].includes(mode)) {
    const error = new Error(
      "Unsupported CODE_RUNNER_MODE. Use local, docker, or disabled."
    );
    error.statusCode = 500;
    throw error;
  }

  if (
    mode === "local" &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_UNSANDBOXED_CODE_RUNNER !==
      "true"
  ) {
    const error = new Error(
      "Local code execution is blocked in production. Use CODE_RUNNER_MODE=docker or explicitly set ALLOW_UNSANDBOXED_CODE_RUNNER=true."
    );
    error.statusCode = 503;
    throw error;
  }
};

const normalizeTests = (tests = []) =>
  tests.slice(0, MAX_TESTS).map(
    (test, index) => {
      const input =
        String(test.input || "");
      const expected =
        String(test.expected || "");

      if (
        byteLength(input) >
          MAX_TEST_INPUT_BYTES ||
        byteLength(expected) >
          MAX_TEST_INPUT_BYTES
      ) {
        const error = new Error(
          "A test case is too large."
        );
        error.statusCode = 413;
        throw error;
      }

      return {
        name:
          test.name ||
          `Test ${index + 1}`,
        input,
        expected,
      };
    }
  );

const runCodingSubmission =
  async (req, res) => {
    const {
      language,
      code,
      tests = [],
    } = req.body;

    const config =
      LANGUAGE_CONFIG[language];

    if (!config) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported language",
      });
    }

    if (!code?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Code is required",
      });
    }

    if (
      byteLength(code) >
      MAX_CODE_BYTES
    ) {
      return res.status(413).json({
        success: false,
        message:
          "Code is too large.",
      });
    }

    const runnerMode =
      getRunnerMode();

    try {
      validateRunnerMode(runnerMode);
    } catch (error) {
      return res.status(
        error.statusCode || 500
      ).json({
        success: false,
        message:
          error.message,
      });
    }

    let safeTests;

    try {
      safeTests =
        normalizeTests(tests);
    } catch (error) {
      return res.status(
        error.statusCode || 400
      ).json({
        success: false,
        message:
          error.message,
      });
    }

    const workDir =
      path.join(
        os.tmpdir(),
        `mockpro-${crypto.randomUUID()}`
      );

    try {
      await fs.mkdir(workDir, {
        recursive: true,
        mode: 0o700,
      });
      await fs.writeFile(
        path.join(
          workDir,
          config.file
        ),
        code,
        {
          mode: 0o600,
        }
      );

      if (config.local.compile) {
        const compileResult =
          await runSubmissionCommand(
            runnerMode,
            config,
            "compile",
            "",
            workDir
          );

        if (!compileResult.success) {
          return res.status(200).json({
            success: true,
            runnerMode,
            compiled: false,
            results: [],
            error:
              compileResult.stderr ||
              compileResult.stdout ||
              "Compilation failed",
          });
        }
      }

      const results = [];

      for (const test of safeTests) {
        const runResult =
          await runSubmissionCommand(
            runnerMode,
            config,
            "run",
            test.input,
            workDir
          );
        const actual =
          normalizeOutput(
            runResult.stdout
          );
        const expected =
          normalizeOutput(
            test.expected
          );

        results.push({
          ...test,
          actual,
          passed:
            runResult.success &&
            actual === expected,
          stderr:
            runResult.stderr,
        });
      }

      const passed =
        results.filter(
          (test) => test.passed
        ).length;

      res.status(200).json({
        success: true,
        runnerMode,
        compiled: true,
        passed,
        total:
          results.length,
        results,
      });

    } catch (error) {
      const isDockerMissing =
        runnerMode === "docker" &&
        /ENOENT|docker/i.test(
          error.message
        );

      res.status(
        isDockerMissing ? 503 : 500
      ).json({
        success: false,
        message:
          isDockerMissing
            ? "Docker runner is not available on this server."
            : error.message,
      });
    } finally {
      await fs.rm(workDir, {
        recursive: true,
        force: true,
      });
    }
  };

module.exports = {
  runCodingSubmission,
};
