import useStore from "../store/useStore";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Helper to parse AI response with fallback cleaning.
 */
function attemptParse(text) {
  if (!text || typeof text !== "string") return null;

  try {
    return JSON.parse(text);
  } catch (directError) {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (cleanError) {
      return null;
    }
  }
}

/**
 * Performs the actual fetch call to OpenRouter.
 */
async function fetchFromAI(userInput, apiKey) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        {
          role: "system",
          content: `You must return ONLY a JSON array.
Each item must include: name, quantity, unit, calories, protein, carbs, fat.
Rules: No conversational text, no summary, singular names, estimate realistic values.`,
        },
        {
          role: "user",
          content: userInput.trim(),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI request failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Parses a natural language food input string using the OpenRouter API.
 * @param {string} userInput 
 * @param {string} [providedApiKey] - Optional, will fallback to store if not provided
 */
export async function parseFoodWithAI(userInput, providedApiKey) {
  const apiKey = providedApiKey || useStore.getState().apiKey;

  if (!apiKey) {
    throw new Error("API key not found. Please connect your AI key in settings.");
  }

  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    return [];
  }

  const MAX_RETRIES = 1;
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
    try {
      const rawContent = await fetchFromAI(userInput, apiKey);
      const parsed = attemptParse(rawContent);

      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => ({
          name: String(item.name || "unknown").toLowerCase().trim(),
          quantity: Number(item.quantity) || 1,
          unit: String(item.unit || "unit").toLowerCase().trim(),
          calories: Number(item.calories) || 0,
          protein: Number(item.protein) || 0,
          carbs: Number(item.carbs) || 0,
          fat: Number(item.fat) || 0,
        }));
      }
    } catch (err) {
      console.error(`AI Attempt ${attempts + 1} failed:`, err.message);
      if (attempts === MAX_RETRIES) throw err;
    }

    attempts++;
  }

  return [];
}
