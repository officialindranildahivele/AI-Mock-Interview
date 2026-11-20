const axios = require("axios");
const {
  GoogleGenerativeAI,
} = require("@google/generative-ai");

const SUPPORTED_PROVIDERS = [
  "openrouter",
  "gemini",
  "deepseek",
];

const DEFAULT_MODELS = {
  openrouter: "openai/gpt-oss-20b:free",
  gemini: "gemini-1.5-flash",
  deepseek: "deepseek-chat",
};

const normalizeProvider = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const getPurposeKey = (purpose = "general") =>
  String(purpose)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");

const hasProviderConfig = (provider) => {
  if (provider === "openrouter") {
    return Boolean(process.env.OPENROUTER_API_KEY);
  }

  if (provider === "gemini") {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  if (provider === "deepseek") {
    return Boolean(process.env.DEEPSEEK_API_KEY);
  }

  return false;
};

const getProviderOrder = (purpose) => {
  const purposeKey =
    getPurposeKey(purpose);
  const preferred =
    normalizeProvider(
      process.env[`${purposeKey}_AI_PROVIDER`] ||
      process.env.AI_PROVIDER ||
      "auto"
    );

  if (preferred && preferred !== "auto") {
    if (!SUPPORTED_PROVIDERS.includes(preferred)) {
      throw new Error(
        `Unsupported AI provider "${preferred}". Use openrouter, gemini, deepseek, or auto.`
      );
    }

    return [preferred];
  }

  return SUPPORTED_PROVIDERS.filter(
    hasProviderConfig
  );
};

const getModel = (provider, purpose) => {
  const purposeKey =
    getPurposeKey(purpose);

  if (provider === "openrouter") {
    return (
      process.env[`OPENROUTER_${purposeKey}_MODEL`] ||
      (purpose === "evaluation"
        ? process.env.OPENROUTER_EVAL_MODEL
        : "") ||
      process.env.OPENROUTER_MODEL ||
      DEFAULT_MODELS.openrouter
    );
  }

  if (provider === "gemini") {
    return (
      process.env[`GEMINI_${purposeKey}_MODEL`] ||
      process.env.GEMINI_MODEL ||
      DEFAULT_MODELS.gemini
    );
  }

  if (provider === "deepseek") {
    return (
      process.env[`DEEPSEEK_${purposeKey}_MODEL`] ||
      process.env.DEEPSEEK_MODEL ||
      DEFAULT_MODELS.deepseek
    );
  }

  return "";
};

const requireProviderConfig = (provider) => {
  if (!hasProviderConfig(provider)) {
    throw new Error(
      `${provider} is selected but its API key is not configured.`
    );
  }
};

const generateWithOpenRouter = async ({
  prompt,
  model,
  temperature,
}) => {
  requireProviderConfig("openrouter");

  const response =
    await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type":
            "application/json",
        },
      }
    );

  return response.data.choices[0].message.content;
};

const generateWithGemini = async ({
  prompt,
  model,
  temperature,
}) => {
  requireProviderConfig("gemini");

  const genAI =
    new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );
  const generativeModel =
    genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
      },
    });
  const result =
    await generativeModel.generateContent(
      prompt
    );

  return result.response.text();
};

const generateWithDeepSeek = async ({
  prompt,
  model,
  temperature,
}) => {
  requireProviderConfig("deepseek");

  const response =
    await axios.post(
      process.env.DEEPSEEK_BASE_URL ||
        "https://api.deepseek.com/chat/completions",
      {
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type":
            "application/json",
        },
      }
    );

  return response.data.choices[0].message.content;
};

const PROVIDER_HANDLERS = {
  openrouter: generateWithOpenRouter,
  gemini: generateWithGemini,
  deepseek: generateWithDeepSeek,
};

const generateText = async ({
  prompt,
  purpose = "general",
  temperature = 0.2,
}) => {
  const providers =
    getProviderOrder(purpose);

  if (providers.length === 0) {
    throw new Error(
      "No AI provider is configured. Add OPENROUTER_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY."
    );
  }

  let lastError = null;

  for (const provider of providers) {
    try {
      const model =
        getModel(provider, purpose);
      const text =
        await PROVIDER_HANDLERS[provider]({
          prompt,
          model,
          temperature,
        });

      return {
        provider,
        model,
        text,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `${provider} ${purpose} AI Error:`
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
  generateText,
  hasProviderConfig,
};
