export const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

const normalizeSpeechRecognitionError = (error) => {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error.trim().toLowerCase();
  }

  if (typeof error.error === "string") {
    return error.error.trim().toLowerCase();
  }

  if (typeof error.message === "string") {
    return error.message.trim().toLowerCase();
  }

  return "";
};

export const getSpeechRecognitionErrorMessage = (error) => {
  const errorCode = normalizeSpeechRecognitionError(error);
  const messages = {
    "audio-capture":
      "Microphone was not found. Check your input device and browser permissions.",
    "not-allowed":
      "Microphone permission is blocked. Allow microphone access in the browser.",
    "service-not-allowed":
      "Speech recognition service is blocked in this browser profile.",
    network:
      "Speech-to-text could not reach Chrome's recognition service. Type the answer manually or retry after checking internet access.",
    "no-speech":
      "No speech was detected. Try again and speak clearly after starting the microphone.",
    aborted:
      "Speech recognition was stopped before it finished.",
    "language-not-supported":
      "The selected speech language is not supported by this browser.",
  };

  const matchingCode = Object.keys(messages).find((code) =>
    errorCode.includes(code)
  );

  return (
    messages[errorCode] ||
    messages[matchingCode] ||
    "Speech recognition failed. Try again."
  );
};
