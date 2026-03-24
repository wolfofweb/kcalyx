const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Helper to parse AI response with fallback cleaning.
 * @param {string} text
 * @returns {any|null} Parsed object or null if failed.
 */
function attemptParse(text) {
  if (!text || typeof text !== "string") return null;

  try {
    console.log("DEBUG: Attempting direct JSON parse...");
    return JSON.parse(text);
  } catch (directError) {
    console.log("DEBUG: Direct parse failed. Attempting to strip markdown fences...");
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (cleanError) {
      console.error("DEBUG: Both direct and cleaned parsing failed.");
      return null;
    }
  }
}

/**
 * Performs the actual fetch call to OpenRouter.
 * @param {string} userInput
 * @returns {Promise<string>} Raw message content string.
 */
async function fetchFromAI(userInput) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        {
          role: "system",
          content: `You must return ONLY a JSON array.

Each item must include:
- name (string)
- quantity (number)
- unit (string)
- calories (number)
- protein (number)
- carbs (number)
- fat (number)

Rules:
- Do NOT return text other than the JSON array.
- Do NOT summarize.
- Do NOT combine multiple items into one.
- Convert plural names to singular (e.g., "eggs" to "egg").
- Infer logical units (piece, bowl, cup, serving, etc.) if not specified.
- Estimate realistic nutrition values.

Example:
[
  { "name": "egg", "quantity": 3, "unit": "pcs", "calories": 210, "protein": 18, "carbs": 2, "fat": 15 }
]`,
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
    console.error(`OpenRouter API error (${response.status}):`, errorBody);
    throw new Error(`OpenRouter API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

/**
 * Parses a natural language food input string using the OpenRouter API with retry logic.
 *
 * @param {string} userInput - A natural language description of food items.
 * @returns {Promise<Array<{ name: string, quantity: number, unit: string, calories: number, protein: number, carbs: number, fat: number }>>} Structured food items.
 */
export async function parseFoodWithAI(userInput) {
  if (!OPENROUTER_API_KEY) {
    console.warn("DEBUG: OpenRouter API key is missing.");
    return [];
  }

  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    return [];
  }

  const MAX_RETRIES = 1;
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
    try {
      console.log(`DEBUG: AI Parse Attempt ${attempts + 1}/${MAX_RETRIES + 1}`);

      const rawContent = await fetchFromAI(userInput);
      console.log("DEBUG: Received raw content from AI:", rawContent);

      const parsed = attemptParse(rawContent);

      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        console.log("DEBUG: Successfully parsed food items:", parsed.length);
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

      console.warn("DEBUG: Result was not a valid non-empty JSON array. Rejecting and retrying...");
    } catch (err) {
      console.error(`DEBUG: Attempt ${attempts + 1} failed with error:`, err.message);
    }

    attempts++;
    if (attempts <= MAX_RETRIES) {
      console.log("DEBUG: Retrying API call...");
    }
  }

  console.error("DEBUG: All AI parse attempts failed. Falling back to empty array.");
  return [];
}
