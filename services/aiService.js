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
      model: "openrouter/free",
      temperature: 0.2,
      max_tokens: 200,
      reasoning: {
        effort: "low",
      },
      messages: [
        {
          role: "system",
          content: `You are a nutrition parser.

Return ONLY a valid JSON array. No text, no explanation. No reasoning.
No thinking.
No extra text.

Each item must have:
name, quantity, unit, calories, protein, carbs, fat

STRICT RULES:

1. Do NOT break combined foods unnecessarily.

   * Example: "milk coffee", "chicken biryani", "egg dosa" → keep as ONE item.

2. Use the SAME quantity mentioned by the user.

   * If user says "150 ml milk coffee" → quantity = 150, unit = ml
   * Do NOT split into smaller quantities.

3. Only split items if clearly separate.

   * Example: "2 eggs and 1 banana" → 2 items

4. If "sugarless" or "no sugar" is mentioned:

   * Do NOT include sugar as a separate item

5. Use realistic nutrition values, but DO NOT invent extra items.

6. Units:

   * ml, g, piece, cup
   * keep consistent

7. Naming:

   * lowercase
   * simple names (e.g., "milk coffee", "boiled egg")

8. Calories and macros should match the TOTAL quantity, not per unit.

9. Output must be valid JSON array ONLY.

Examples:

Input: "2 eggs and coffee"
Output:
[
{ "name": "egg", "quantity": 2, "unit": "piece", "calories": 140, "protein": 12, "carbs": 1, "fat": 10 },
{ "name": "coffee", "quantity": 1, "unit": "cup", "calories": 5, "protein": 0, "carbs": 1, "fat": 0 }
]

Input: "150 ml milk coffee sugarless"
Output:
[
{ "name": "milk coffee", "quantity": 150, "unit": "ml", "calories": 35, "protein": 1, "carbs": 7, "fat": 3 }
]
`,
        },
        {
          role: "user",
          content: userInput.trim(),
        },
      ],
    }),
  });

  if (!response.ok) {
    let msg = "AI connection failed. Please try again.";

    if (response.status === 401) {
      msg = "Invalid API Key. Please check your settings.";
    } else if (response.status === 402) {
      msg = "OpenRouter credits exhausted.";
    } else if (response.status === 429) {
      msg = "Too many requests. Please wait a moment.";
    } else if (response.status === 404) {
      msg = "AI model not found. Please check your configuration.";
    } else if (response.status >= 500) {
      msg = "AI service is currently down. Please try later.";
    }

    throw new Error(msg);
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
    throw new Error(
      "API key not found. Please connect your AI key in settings.",
    );
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
          name: String(item.name || "unknown")
            .toLowerCase()
            .trim(),
          quantity: Number(item.quantity) || 1,
          unit: String(item.unit || "unit")
            .toLowerCase()
            .trim(),
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
