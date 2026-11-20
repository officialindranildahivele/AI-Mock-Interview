const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

const MIME_TYPE_TO_EXTENSION = {
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-m4a": "m4a",
  "audio/x-wav": "wav",
};

const MAX_AUDIO_BYTES =
  Number(
    process.env.MAX_TRANSCRIPTION_AUDIO_BYTES
  ) ||
  8 * 1024 * 1024;

const SUPPORTED_PROVIDERS = [
  "openai",
  "gemini",
  "openrouter",
];

const getCleanMimeType = (mimeType = "") =>
  String(mimeType).split(";")[0].trim().toLowerCase();

const getAudioExtension = (mimeType = "") =>
  MIME_TYPE_TO_EXTENSION[getCleanMimeType(mimeType)] || "webm";

const normalizeBase64 = (audio = "") =>
  String(audio)
    .replace(/^data:.*?base64,/i, "")
    .replace(/\s/g, "")
    .replace(/[^A-Za-z0-9+/=]/g, "");

const hasProviderConfig = (provider) => {
  if (provider === "openai") {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  if (provider === "gemini") {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  if (provider === "openrouter") {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  return false;
};

const getProviderOrder = () => {
  const preferred =
    String(
      process.env.TRANSCRIPTION_PROVIDER ||
      "auto"
    )
      .trim()
      .toLowerCase();

  if (preferred && preferred !== "auto") {
    if (
      !SUPPORTED_PROVIDERS.includes(
        preferred
      )
    ) {
      const error = new Error(
        `Unsupported transcription provider "${preferred}". Use openai, gemini, openrouter, or auto.`
      );
      error.statusCode = 500;
      throw error;
    }

    return [preferred];
  }

  return SUPPORTED_PROVIDERS.filter(
    hasProviderConfig
  );
};

const getOpenAICompatibleConfig = (
  provider
) => {
  if (provider === "openai") {
    return {
      endpoint:
        process.env.OPENAI_TRANSCRIPTION_ENDPOINT ||
        "https://api.openai.com/v1/audio/transcriptions",
      apiKey: process.env.OPENAI_API_KEY,
      model:
        process.env.OPENAI_TRANSCRIPTION_MODEL ||
        "whisper-1",
    };
  }

  if (provider === "openrouter") {
    return {
      endpoint:
        process.env.OPENROUTER_TRANSCRIPTION_ENDPOINT ||
        "https://openrouter.ai/api/v1/audio/transcriptions",
      apiKey: process.env.OPENROUTER_API_KEY,
      model:
        process.env.OPENROUTER_TRANSCRIPTION_MODEL ||
        "openai/whisper-1",
    };
  }

  return null;
};

const transcribeWithOpenAICompatible = async ({
  provider,
  buffer,
  cleanMimeType,
}) => {
  const config =
    getOpenAICompatibleConfig(provider);

  if (!config?.apiKey) {
    const error = new Error(
      `${provider} transcription is selected but its API key is not configured.`
    );
    error.statusCode = 503;
    throw error;
  }

  const form = new FormData();
  const blob = new Blob([buffer], {
    type: cleanMimeType,
  });

  form.append(
    "file",
    blob,
    `voice-answer.${getAudioExtension(cleanMimeType)}`
  );
  form.append("model", config.model);
  form.append("language", "en");
  form.append("temperature", "0");

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: form,
  });

  const payload =
    await response.json().catch(
      () => ({})
    );

  if (!response.ok) {
    const error = new Error(
      payload.error?.message ||
        payload.message ||
        `${provider} audio transcription failed.`
    );
    error.statusCode = response.status;
    throw error;
  }

  return (
    payload.text?.trim() ||
    payload.transcript?.trim() ||
    ""
  );
};

const transcribeWithGemini = async ({
  audioData,
  cleanMimeType,
}) => {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error(
      "Gemini transcription is selected but GEMINI_API_KEY is not configured."
    );
    error.statusCode = 503;
    throw error;
  }

  const genAI =
    new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );
  const model =
    genAI.getGenerativeModel({
      model:
        process.env.GEMINI_TRANSCRIPTION_MODEL ||
        process.env.GEMINI_MODEL ||
        "gemini-1.5-flash",
    });
  const result =
    await model.generateContent([
      {
        inlineData: {
          data: audioData,
          mimeType:
            cleanMimeType ||
            "audio/webm",
        },
      },
      {
        text:
          "Transcribe this interview answer audio in English. Return only the spoken transcript with no labels or commentary.",
      },
    ]);

  return result.response.text().trim();
};

const transcribeWithProvider = async ({
  provider,
  audioData,
  buffer,
  cleanMimeType,
}) => {
  if (provider === "gemini") {
    return transcribeWithGemini({
      audioData,
      cleanMimeType,
    });
  }

  return transcribeWithOpenAICompatible({
    provider,
    buffer,
    cleanMimeType,
  });
};

const transcribeAudio = async ({
  audio,
  mimeType,
}) => {
  const providers =
    getProviderOrder();

  if (providers.length === 0) {
    const error = new Error(
      "Speech transcription is not configured. Add OPENAI_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY."
    );
    error.statusCode = 503;
    throw error;
  }

  const data =
    normalizeBase64(audio);

  if (!data) {
    const error = new Error("Audio recording is empty.");
    error.statusCode = 400;
    throw error;
  }

  const cleanMimeType =
    getCleanMimeType(mimeType) || "audio/webm";
  const buffer =
    Buffer.from(data, "base64");

  console.debug("Voice transcription audio metadata", {
    mimeType: cleanMimeType,
    base64Length: data.length,
    bufferLength: buffer.length,
    trimmedPrefix: data.slice(0, 40),
  });

  if (buffer.length === 0) {
    const error = new Error("Audio recording is empty.");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > MAX_AUDIO_BYTES) {
    const error = new Error(
      "Recording is too large. Keep the answer shorter and try again."
    );
    error.statusCode = 413;
    throw error;
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      const transcript =
        await transcribeWithProvider({
          provider,
          audioData: data,
          buffer,
          cleanMimeType,
        });

      if (transcript?.trim()) {
        return transcript.trim();
      }

      const error = new Error(
        "No speech was detected in the recording."
      );
      error.statusCode = 422;
      throw error;
    } catch (error) {
      lastError = error;
      console.error(
        `${provider} Voice Transcription Error:`
      );
      console.error(
        error.response?.data ||
        error.message
      );
    }
  }

  throw lastError;
};

module.exports = {
  transcribeAudio,
};
