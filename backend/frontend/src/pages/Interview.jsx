import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import API from "../services/api";
import {
  getSpeechRecognition,
  getSpeechRecognitionErrorMessage,
} from "../utils/speechRecognition";

const normalizeQuestions = (items = []) =>
  items.map((item, index) => ({
    id: item.id,
    question: item.question || item.text || item,
    answer: item.answer || "",
    score: item.score ?? null,
    feedback: item.feedback || "",
    position: index + 1,
  }));

const AUDIO_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

const getSupportedAudioMimeType = () => {
  if (!window.MediaRecorder?.isTypeSupported) {
    return "";
  }

  return (
    AUDIO_MIME_TYPES.find((mimeType) =>
      window.MediaRecorder.isTypeSupported(mimeType)
    ) || ""
  );
};

const readBlobAsDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (!reader.result) {
        reject(new Error("Could not read audio recording."));
        return;
      }

      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Could not read audio recording."));
    reader.readAsDataURL(blob);
  });

function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);
  const recordingStartAtRef = useRef(null);
  const voiceMode = searchParams.get("mode") === "voice";

  const [questions, setQuestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceAutoSubmit, setVoiceAutoSubmit] = useState(voiceMode);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      setError("");

      try {
        const cached = JSON.parse(localStorage.getItem("questions") || "[]");

        if (cached.length > 0) {
          const cachedQuestions = normalizeQuestions(cached);
          setQuestions(cachedQuestions);
          setAnswer(cachedQuestions[0]?.answer || "");
        }

        const res = await API.get(`/interview/${id}`);
        const loaded = normalizeQuestions(res.data.questions || []);

        if (loaded.length > 0) {
          setQuestions(loaded);
          setAnswer(loaded[0]?.answer || "");
          localStorage.setItem("questions", JSON.stringify(loaded));
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load interview questions."
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [id]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      audioStreamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    },
    []
  );

  const activeQuestion = questions[activeIndex];
  const evaluation =
    activeQuestion?.score !== null && activeQuestion?.score !== undefined
      ? {
          score: activeQuestion.score,
          feedback: activeQuestion.feedback,
        }
      : null;

  const progress = useMemo(() => {
    const answered = questions.filter((question) => question.score !== null)
      .length;

    return {
      answered,
      total: questions.length,
      percent: questions.length === 0 ? 0 : (answered / questions.length) * 100,
    };
  }, [questions]);

  const submitAnswer = async (answerOverride) => {
    if (!activeQuestion) {
      return;
    }

    const answerToSubmit =
      typeof answerOverride === "string"
        ? answerOverride
        : answer;

    if (!answerToSubmit.trim()) {
      setError("Write an answer before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await API.post("/answer/submit", {
        questionId: activeQuestion.id,
        answer: answerToSubmit,
      });

      const nextEvaluation = res.data.evaluation;

      setQuestions((current) => {
        const next = current.map((question, index) =>
          index === activeIndex
            ? {
                ...question,
                answer: answerToSubmit,
                score: nextEvaluation.score,
                feedback: nextEvaluation.feedback,
              }
            : question
        );

        localStorage.setItem("questions", JSON.stringify(next));
        return next;
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Answer evaluation failed. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectQuestion = (index) => {
    const selectedQuestion = questions[index];

    stopVoiceAnswer();
    setActiveIndex(index);
    setAnswer(selectedQuestion?.answer || "");
    setError("");
    setVoiceError("");
    setInterimTranscript("");
  };

  const goNext = () => {
    if (activeIndex < questions.length - 1) {
      selectQuestion(activeIndex + 1);
      return;
    }

    navigate(`/results/${id}`);
  };

  const startBrowserSpeechRecognition = () => {
    setVoiceError("");

    const Recognition = getSpeechRecognition();

    if (!Recognition) {
      setVoiceError("Speech recognition is not available in this browser.");
      return;
    }

    const recognition = new Recognition();
    const startingAnswer = answer.trim();
    let finalTranscript = "";

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;

        if (event.results[index].isFinal) {
          finalTranscript += `${transcript} `;
        } else {
          interim += transcript;
        }
      }

      const nextAnswer = [startingAnswer, finalTranscript, interim]
        .filter(Boolean)
        .join(" ")
        .trim();

      setAnswer(nextAnswer);
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      const errorMessage = getSpeechRecognitionErrorMessage(event.error);
      const errorCode = String(event.error || "").toLowerCase();

      if (
        ["network", "service-not-allowed", "not-allowed", "audio-capture"].some(
          (code) => errorCode.includes(code)
        ) &&
        navigator.mediaDevices?.getUserMedia &&
        window.MediaRecorder
      ) {
        setVoiceError(`${errorMessage} Falling back to microphone recording...`);
        setListening(false);
        startAudioRecorderVoiceAnswer();
        return;
      }

      setVoiceError(errorMessage);
      setListening(false);
    };

    recognition.onend = () => {
      const finalAnswer = [startingAnswer, finalTranscript]
        .filter(Boolean)
        .join(" ")
        .trim();

      setListening(false);
      setInterimTranscript("");

      if (finalAnswer) {
        setAnswer(finalAnswer);
      }

      if (voiceAutoSubmit && finalAnswer) {
        submitAnswer(finalAnswer);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      setVoiceError(getSpeechRecognitionErrorMessage(err));
      setListening(false);
    }
  };

  const startAudioRecorderVoiceAnswer = async () => {
    setVoiceError("");
    setInterimTranscript("");

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      setVoiceError(
        "Microphone recording is not available in this browser."
      );
      return;
    }

    const startingAnswer = answer.trim();
    const chunks = [];

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      const mimeType =
        getSupportedAudioMimeType();
      const recorder =
        new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined
        );

      audioStreamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunks.push(event.data);
          console.debug("voice-recording chunk", {
            chunkSize: event.data.size,
            chunkType: event.data.type,
            totalChunks: chunks.length,
          });
        }
      };

      recorder.onerror = () => {
        setVoiceError("Microphone recording failed. Try again.");
        setListening(false);
      };

      recorder.onstop = async () => {
        setListening(false);
        audioStreamRef.current
          ?.getTracks()
          .forEach((track) => track.stop());
        audioStreamRef.current = null;

        if (chunks.length === 0) {
          setInterimTranscript("");
          setVoiceError("No audio was captured. Try again.");
          return;
        }

        try {
          setInterimTranscript("Transcribing...");
          const audioBlob = new Blob(chunks, {
            type:
              recorder.mimeType ||
              mimeType ||
              "audio/webm",
          });

          const recordingDuration = Math.max(
            0,
            Date.now() - (recordingStartAtRef.current || Date.now())
          );

          console.debug("voice-recording final", {
            blobSize: audioBlob.size,
            blobType: audioBlob.type,
            chunks: chunks.length,
            recorderState: recorder.state,
            recordingDuration,
          });

          const audio =
            await readBlobAsDataUrl(audioBlob);
          console.debug("voice-recording data-url prefix", audio.slice(0, 80));
          const res =
            await API.post("/answer/transcribe", {
              audio,
              mimeType:
                audioBlob.type ||
                "audio/webm",
            });
          const transcript =
            res.data.transcript?.trim();
          const finalAnswer = [
            startingAnswer,
            transcript,
          ]
            .filter(Boolean)
            .join(" ")
            .trim();

          setInterimTranscript("");

          if (!finalAnswer) {
            setVoiceError("No speech was detected. Try again.");
            return;
          }

          setAnswer(finalAnswer);

          if (voiceAutoSubmit) {
            submitAnswer(finalAnswer);
          }
        } catch (err) {
          setInterimTranscript("");
          setVoiceError(
            err.response?.data?.message ||
              "Voice transcription failed. Type the answer manually or try again."
          );
        }
      };

      recordingStartAtRef.current = Date.now();
      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setListening(true);
      setInterimTranscript("Recording...");
    } catch (err) {
      setVoiceError(
        err.name === "NotAllowedError"
          ? "Microphone permission is blocked. Allow microphone access in the browser."
          : err.message || "Could not start microphone."
      );
      setListening(false);
      setInterimTranscript("");
    }
  };

  const startVoiceAnswer = async () => {
    setVoiceError("");
    setInterimTranscript("");
    await startAudioRecorderVoiceAnswer();
  };

  const stopVoiceAnswer = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.requestData?.();
      } catch (err) {
        console.warn("MediaRecorder.requestData failed", err);
      }

      mediaRecorderRef.current.stop();
    }

    recognitionRef.current?.stop();
    setListening(false);
  };

  const actions = (
    <>
      <button
        className="btn"
        type="button"
        onClick={() => navigate(`/results/${id}`)}
      >
        View results
      </button>
      <button
        className="btn primary"
        type="button"
        onClick={() => navigate("/dashboard")}
      >
        Dashboard
      </button>
    </>
  );

  return (
    <AppShell
      eyebrow="Live interview"
      title="Answer your AI-generated questions"
      subtitle="Move through the round one answer at a time. Each submission is evaluated and saved to your interview history."
      actions={actions}
    >
      <section className="interview-layout animate-in">
        <div className="question-panel">
          <div className="question-topline">
            <span className="pill">
              Question {activeIndex + 1} of {questions.length || 0}
            </span>
            <span className="pill">
              {progress.answered}/{progress.total || 0} evaluated
            </span>
          </div>

          <div className="progress-track interview-progress">
            <div
              className="progress-fill"
              style={{ "--progress": `${progress.percent}%` }}
            />
          </div>

          {loading ? (
            <div className="empty-state">Loading interview questions...</div>
          ) : error && questions.length === 0 ? (
            <div className="empty-state">{error}</div>
          ) : activeQuestion ? (
            <>
              <h2>{activeQuestion.question}</h2>

              <div className="field-group answer-field">
                <label htmlFor="answer">Your answer</label>
                <textarea
                  id="answer"
                  className="textarea"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Structure your answer clearly: context, concept, example, and conclusion."
                />
              </div>

              {interimTranscript && (
                <p className="voice-interim">
                  Listening: {interimTranscript}
                </p>
              )}

              {error && <p className="error-text">{error}</p>}

              {evaluation && (
                <div className="feedback-panel">
                  <div className="score-badge">{evaluation.score}/10</div>
                  <div>
                    <h3>AI feedback</h3>
                    <p>{evaluation.feedback}</p>
                  </div>
                </div>
              )}

              <div className="button-row">
                <button
                  className="btn"
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => selectQuestion(activeIndex - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn primary"
                  type="button"
                  disabled={submitting}
                  onClick={() => submitAnswer()}
                >
                  {submitting ? "Evaluating..." : "Submit answer"}
                </button>
                <button className="btn success" type="button" onClick={goNext}>
                  {activeIndex === questions.length - 1
                    ? "Finish round"
                    : "Next question"}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              No questions were found for this interview.
            </div>
          )}
        </div>

        <aside className="panel">
          <h2 className="section-title">Question map</h2>
          <div className="question-nav">
            {questions.map((question, index) => (
              <button
                className={
                  index === activeIndex
                    ? "question-dot active"
                    : question.score !== null
                      ? "question-dot complete"
                      : "question-dot"
                }
                key={question.id || index}
                type="button"
                onClick={() => selectQuestion(index)}
                aria-label={`Go to question ${index + 1}`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="metric-card compact">
            <p className="metric-label">Round progress</p>
            <p className="metric-value">{Math.round(progress.percent)}%</p>
            <p className="metric-note">
              Submit each answer to unlock the final report.
            </p>
          </div>

          <div className="voice-panel">
            <h2 className="section-title">Voice answer</h2>
            {voiceError && <p className="error-text">{voiceError}</p>}

            <label className="toggle-row">
              <input
                type="checkbox"
                checked={voiceAutoSubmit}
                onChange={(event) => setVoiceAutoSubmit(event.target.checked)}
              />
              <span>Auto submit after speech</span>
            </label>

            <button
              className={listening ? "btn danger full-width" : "btn full-width"}
              type="button"
              disabled={!activeQuestion || submitting}
              onClick={listening ? stopVoiceAnswer : startVoiceAnswer}
            >
              {listening ? "Stop microphone" : "Start microphone"}
            </button>
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

export default Interview;
