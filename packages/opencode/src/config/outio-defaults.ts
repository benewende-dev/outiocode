/**
 * OutioCode — default provider baked into the IDE.
 *
 * OutioCode is "routed by Outio": out of the box the IDE talks to the Outio
 * platform's OpenAI-compatible endpoint (https://outio.app/api/v1) using an
 * `outio_sk_…` key from the OUTIO_API_KEY environment variable. No config file
 * is required — this default is merged FIRST in `loadGlobal`, so any user
 * `opencode.json` / `outio.json` still overrides it.
 *
 * Tier A change (user-facing default provider). Kept in its own module so
 * upstream OpenCode merges stay mechanical.
 *
 * Credit cost is governed by the Outio platform (échelle 1–10), not here: the
 * `cost` fields below are 0 because billing happens server-side on /api/v1.
 * The model list is curated for coding work; the Outio backend resolves each
 * slug and rations premium models via the monthly credit budget.
 */

// The Info type is the config schema; we type loosely to avoid a hard import
// cycle with config.ts. Shape matches ProviderConfig in the SDK.
type OutioDefaults = {
  provider: Record<string, unknown>
}

const BASE_URL = process.env["OUTIO_API_BASE"] ?? "https://outio.app/api/v1"

export const OUTIO_DEFAULTS: OutioDefaults = {
  provider: {
    outio: {
      name: "Outio",
      npm: "@ai-sdk/openai-compatible",
      env: ["OUTIO_API_KEY"],
      options: {
        baseURL: BASE_URL,
      },
      models: {
        "anthropic/claude-opus-4.7": {
          name: "Claude Opus 4.7",
          reasoning: true,
          attachment: true,
          temperature: true,
        },
        "openai/gpt-5.5": {
          name: "GPT-5.5",
          reasoning: true,
          attachment: true,
          temperature: true,
        },
        "google/gemini-3.1-pro": {
          name: "Gemini 3.1 Pro",
          attachment: true,
          temperature: true,
        },
        "x-ai/grok-4.3": {
          name: "Grok 4.3",
          temperature: true,
        },
        "deepseek/deepseek-v4-pro": {
          name: "DeepSeek V4 Pro",
          reasoning: true,
          temperature: true,
        },
        "moonshot/kimi-k2.6": {
          name: "Kimi K2.6",
          temperature: true,
        },
        "alibaba/qwen-3.6-max": {
          name: "Qwen 3.6 Max",
          temperature: true,
        },
        "z-ai/glm-5.1": {
          name: "GLM 5.1",
          temperature: true,
        },
        "google/gemma-4-31b-it:free": {
          name: "Gemma 4 31B (gratuit)",
          temperature: true,
        },
      },
    },
  },
}

/** Default model the IDE selects when the user hasn't chosen one. */
export const OUTIO_DEFAULT_MODEL = "outio/deepseek/deepseek-v4-pro"
