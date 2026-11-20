import { useEffect, useRef, useState } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";
import AppShell from "../components/AppShell";
import {
  getSpeechRecognition,
  getSpeechRecognitionErrorMessage,
} from "../utils/speechRecognition";

const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";

const LANDMARKS = {
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  noseTip: 1,
  chin: 152,
  forehead: 10,
  mouthLeft: 61,
  mouthRight: 291,
  upperLip: 13,
  lowerLip: 14,
};

const clamp = (value, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const distance = (a, b) =>
  Math.hypot((a?.x || 0) - (b?.x || 0), (a?.y || 0) - (b?.y || 0));

const getBlendScore = (blendshapes, name) => {
  const category = blendshapes?.categories?.find(
    (item) => item.categoryName === name
  );

  return category?.score || 0;
};

const getHeadPoseLabel = ({ yaw, pitch, roll }) => {
  if (Math.abs(roll) > 16) {
    return roll > 0 ? "Tilt Right" : "Tilt Left";
  }

  if (Math.abs(yaw) > 18) {
    return yaw > 0 ? "Turn Right" : "Turn Left";
  }

  if (Math.abs(pitch) > 16) {
    return pitch > 0 ? "Look Down" : "Look Up";
  }

  return "Centered";
};

function CameraInterview() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const sampleTimerRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechStartedAtRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [modelStatus, setModelStatus] = useState("Ready");
  const [metrics, setMetrics] = useState({
    eyeContact: 0,
    confidence: 0,
    smile: 0,
    headPose: "Waiting",
    speakingSpeed: "Waiting",
    wordsPerMinute: 0,
  });

  useEffect(
    () => () => {
      clearInterval(sampleTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recognitionRef.current?.stop();
      faceLandmarkerRef.current?.close();
    },
    []
  );

  const loadFaceLandmarker = async () => {
    if (faceLandmarkerRef.current) {
      return faceLandmarkerRef.current;
    }

    setModelStatus("Loading MediaPipe");

    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: FACE_MODEL_URL,
        delegate: "GPU",
      },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    });

    faceLandmarkerRef.current = faceLandmarker;
    setModelStatus("MediaPipe active");

    return faceLandmarker;
  };

  const analyzeWithMediaPipe = async (video) => {
    const faceLandmarker = await loadFaceLandmarker();
    const result = faceLandmarker.detectForVideo(video, performance.now());
    const landmarks = result.faceLandmarks?.[0];

    if (!landmarks) {
      setMetrics((current) => ({
        ...current,
        eyeContact: 0,
        confidence: 0,
        smile: 0,
        headPose: "No face",
      }));
      return true;
    }

    const leftEyeOuter = landmarks[LANDMARKS.leftEyeOuter];
    const leftEyeInner = landmarks[LANDMARKS.leftEyeInner];
    const rightEyeInner = landmarks[LANDMARKS.rightEyeInner];
    const rightEyeOuter = landmarks[LANDMARKS.rightEyeOuter];
    const noseTip = landmarks[LANDMARKS.noseTip];
    const chin = landmarks[LANDMARKS.chin];
    const forehead = landmarks[LANDMARKS.forehead];
    const mouthLeft = landmarks[LANDMARKS.mouthLeft];
    const mouthRight = landmarks[LANDMARKS.mouthRight];
    const upperLip = landmarks[LANDMARKS.upperLip];
    const lowerLip = landmarks[LANDMARKS.lowerLip];

    const leftEyeCenter = {
      x: (leftEyeOuter.x + leftEyeInner.x) / 2,
      y: (leftEyeOuter.y + leftEyeInner.y) / 2,
    };
    const rightEyeCenter = {
      x: (rightEyeInner.x + rightEyeOuter.x) / 2,
      y: (rightEyeInner.y + rightEyeOuter.y) / 2,
    };
    const eyeCenter = {
      x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
      y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
    };
    const faceCenter = {
      x: (eyeCenter.x + chin.x) / 2,
      y: (forehead.y + chin.y) / 2,
    };
    const faceHeight = Math.max(distance(forehead, chin), 0.1);
    const eyeWidth = Math.max(distance(leftEyeOuter, rightEyeOuter), 0.1);
    const mouthWidth = distance(mouthLeft, mouthRight);
    const mouthOpen = distance(upperLip, lowerLip);
    const blendshapes = result.faceBlendshapes?.[0];

    const yaw = ((noseTip.x - faceCenter.x) / eyeWidth) * 90;
    const pitch = ((noseTip.y - eyeCenter.y) / faceHeight - 0.34) * 120;
    const roll =
      (Math.atan2(
        rightEyeCenter.y - leftEyeCenter.y,
        rightEyeCenter.x - leftEyeCenter.x
      ) *
        180) /
      Math.PI;
    const poseScore = clamp(
      100 - Math.abs(yaw) * 2.1 - Math.abs(pitch) * 1.7 - Math.abs(roll) * 1.5
    );
    const centeredScore = clamp(
      100 -
        Math.abs(noseTip.x - 0.5) * 150 -
        Math.abs(noseTip.y - 0.48) * 110
    );
    const eyeContact = Math.round((poseScore * 0.72 + centeredScore * 0.28));
    const blendSmile =
      ((getBlendScore(blendshapes, "mouthSmileLeft") +
        getBlendScore(blendshapes, "mouthSmileRight")) /
        2) *
      100;
    const landmarkSmile = clamp((mouthWidth / eyeWidth - 0.34) * 185);
    const mouthPenalty = clamp(mouthOpen / eyeWidth * 130, 0, 18);
    const smile = Math.round(
      blendSmile > 1 ? blendSmile : clamp(landmarkSmile - mouthPenalty)
    );
    const confidence = Math.round(
      clamp(eyeContact * 0.44 + poseScore * 0.28 + smile * 0.18 + 10)
    );

    setMetrics((current) => ({
      ...current,
      eyeContact,
      confidence,
      smile,
      headPose: getHeadPoseLabel({ yaw, pitch, roll }),
    }));

    return true;
  };

  const analyzeWithFaceDetector = async (video) => {
    if (!("FaceDetector" in window)) {
      return false;
    }

    if (!faceDetectorRef.current) {
      faceDetectorRef.current = new window.FaceDetector({
        fastMode: true,
        maxDetectedFaces: 1,
      });
    }

    const faces = await faceDetectorRef.current.detect(video);
    const face = faces[0];

    if (!face?.boundingBox) {
      return false;
    }

    const box = face.boundingBox;
    const faceCenter = box.x + box.width / 2;
    const videoCenter = video.videoWidth / 2;
    const offset = Math.abs(faceCenter - videoCenter) / videoCenter;
    const centeredScore = clamp(Math.round(98 - offset * 48), 0, 98);
    const sizeScore = clamp(
      Math.round((box.width / video.videoWidth) * 210),
      48,
      96
    );

    setModelStatus("FaceDetector fallback");
    setMetrics((current) => ({
      ...current,
      eyeContact: centeredScore,
      confidence: Math.round((centeredScore + sizeScore) / 2),
      smile: current.smile || 0,
      headPose: centeredScore > 78 ? "Centered" : "Off Center",
    }));

    return true;
  };

  const analyzeBrightnessFallback = (video, canvas) => {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    canvas.width = 96;
    canvas.height = 72;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frame = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let brightness = 0;

    for (let index = 0; index < frame.length; index += 4) {
      brightness += (frame[index] + frame[index + 1] + frame[index + 2]) / 3;
    }

    const averageBrightness = brightness / (frame.length / 4);
    const signal = averageBrightness > 24;

    setModelStatus("Camera signal fallback");
    setMetrics((current) => ({
      ...current,
      eyeContact: signal ? 72 : 0,
      confidence: signal ? 68 : 0,
      smile: 0,
      headPose: signal ? "Camera On" : "No Signal",
    }));
  };

  const sampleCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2) {
      return;
    }

    try {
      const mediaPipeHandled = await analyzeWithMediaPipe(video);

      if (mediaPipeHandled) {
        return;
      }
    } catch (err) {
      console.log(err);
      setModelStatus("MediaPipe unavailable");
    }

    try {
      const faceDetectorHandled = await analyzeWithFaceDetector(video);

      if (faceDetectorHandled) {
        return;
      }
    } catch (err) {
      console.log(err);
    }

    analyzeBrightnessFallback(video, canvas);
  };

  const startCamera = async () => {
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      clearInterval(sampleTimerRef.current);
      sampleTimerRef.current = setInterval(sampleCamera, 650);
      setCameraOn(true);
      sampleCamera();
    } catch (err) {
      setError(
        err.message || "Camera permission failed. Check browser permissions."
      );
    }
  };

  const stopCamera = () => {
    clearInterval(sampleTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOn(false);
    setModelStatus("Ready");
    setMetrics((current) => ({
      ...current,
      eyeContact: 0,
      confidence: 0,
      smile: 0,
      headPose: "Waiting",
    }));
  };

  const startSpeechSpeed = () => {
    setError("");

    const Recognition = getSpeechRecognition();

    if (!Recognition) {
      setError("Speech recognition is not available in this browser.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    speechStartedAtRef.current = Date.now();

    recognition.onresult = (event) => {
      let fullTranscript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        fullTranscript += `${event.results[index][0].transcript} `;
      }

      const words = fullTranscript.trim().split(/\s+/).filter(Boolean);
      const elapsedMinutes = Math.max(
        (Date.now() - speechStartedAtRef.current) / 60000,
        0.1
      );
      const wordsPerMinute = Math.round(words.length / elapsedMinutes);

      let speakingSpeed = "Good";

      if (wordsPerMinute > 165) {
        speakingSpeed = "Fast";
      } else if (wordsPerMinute > 0 && wordsPerMinute < 95) {
        speakingSpeed = "Slow";
      }

      setTranscript(fullTranscript.trim());
      setMetrics((current) => ({
        ...current,
        speakingSpeed,
        wordsPerMinute,
      }));
    };

    recognition.onerror = (event) => {
      setError(getSpeechRecognitionErrorMessage(event.error));
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      setError(getSpeechRecognitionErrorMessage(err));
      setListening(false);
    }
  };

  const stopSpeechSpeed = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <AppShell
      eyebrow="Camera interview"
      title="MediaPipe camera confidence analysis"
      subtitle="Use webcam landmarks and microphone timing to track eye contact, smile, head pose, confidence, and speaking speed during practice."
    >
      <section className="camera-layout">
        <div className="panel camera-panel animate-in">
          <div className="camera-frame">
            <video ref={videoRef} playsInline muted />
            {!cameraOn && (
              <div className="camera-placeholder">
                <span>CAM</span>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="sr-only" />

          <div className="camera-status">
            <span>{modelStatus}</span>
            <span>{cameraOn ? "Live analysis" : "Camera idle"}</span>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div className="button-row">
            <button
              className="btn primary"
              type="button"
              onClick={cameraOn ? stopCamera : startCamera}
            >
              {cameraOn ? "Stop camera" : "Start camera"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={listening ? stopSpeechSpeed : startSpeechSpeed}
            >
              {listening ? "Stop speech" : "Measure speech"}
            </button>
          </div>
        </div>

        <aside className="camera-metrics animate-in">
          <MetricGauge label="Eye Contact" value={metrics.eyeContact} suffix="%" />
          <MetricGauge label="Confidence" value={metrics.confidence} suffix="%" />
          <MetricGauge label="Smile" value={metrics.smile} suffix="%" />
          <div className="metric-card">
            <p className="metric-label">Head Pose</p>
            <p className="metric-value compact-value">{metrics.headPose}</p>
            <p className="metric-note">Yaw, pitch, and roll estimate</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Speaking Speed</p>
            <p className="metric-value compact-value">{metrics.speakingSpeed}</p>
            <p className="metric-note">{metrics.wordsPerMinute} words/min</p>
          </div>
        </aside>
      </section>

      {transcript && (
        <section className="panel transcript-panel animate-in">
          <h2 className="section-title">Speech transcript</h2>
          <p>{transcript}</p>
        </section>
      )}
    </AppShell>
  );
}

function MetricGauge({ label, value, suffix }) {
  return (
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">
        {value}
        {suffix}
      </p>
      <div className="progress-track">
        <div className="progress-fill green" style={{ "--progress": `${value}%` }} />
      </div>
    </div>
  );
}

export default CameraInterview;
