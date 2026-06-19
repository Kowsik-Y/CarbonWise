import { CarbonAssessment, Challenge } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

function cleanJson(str: string): string {
  return str.replace(/```json/i, "").replace(/```/g, "").trim();
}

/**
 * Generates personalized carbon-reduction challenges.
 * Utilizes Gemini if configured, otherwise falls back to static rule-based templates.
 * 
 * @param assessment - The user's latest Carbon Assessment data, or null.
 * @returns A promise resolving to the list of generated challenges.
 */
export async function generateDynamicChallenges(assessment: CarbonAssessment | null): Promise<Challenge[]> {
  if (!assessment) return [];

  const {
    transportKm,
    transportType,
    electricityBill,
    foodHabits,
    shoppingHabits,
    wasteHabits,
    transportEmissions,
    energyEmissions,
    foodEmissions,
    shoppingEmissions,
    wasteEmissions,
    annualFootprint,
    carbonScore
  } = assessment;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
You are CarbonWise, a sustainability advisor. Generate 2 highly personalized weekly challenges for a user based on their carbon assessment metrics:
- Overall Score: ${carbonScore}/100
- Annual Footprint: ${Math.round(annualFootprint)} kg CO2e
- Transportation: ${Math.round(transportEmissions)} kg (travels ${transportKm} km/day on ${transportType})
- Energy/Electricity: ${Math.round(energyEmissions)} kg (monthly bill: $${electricityBill})
- Diet/Food: ${Math.round(foodEmissions)} kg (${foodHabits})
- Shopping: ${Math.round(shoppingEmissions)} kg (${shoppingHabits})
- Waste/Recycling: ${Math.round(wasteEmissions)} kg (${wasteHabits})

Guidelines:
1. One challenge must address their highest emission source.
2. The other challenge must address their second highest source.
3. Keep them realistic and actionable.
4. Return ONLY a valid JSON array containing objects with these exact keys:
   - "code": a unique string slug starting with "ai-" (e.g. "ai-bike-to-work")
   - "title": short, catchy challenge name
   - "description": exactly what the user needs to do
   - "category": one of "transport", "energy", "food", "shopping", "waste"
   - "points": integer between 50 and 300 depending on difficulty
   - "duration": text (e.g. "3 days", "7 days", "1 day")
   - "difficulty": "easy", "medium", or "hard"

Do not include any wrapping markdown formatting (like \`\`\`json) or extra text. Return ONLY raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini dynamic challenges error", e);
    }
  }

  // --- LOCAL FALLBACK DYNAMIC CHALLENGES ---
  const categories: Array<{
    name: "transport" | "energy" | "food" | "shopping" | "waste";
    value: number;
    code: string;
    title: string;
    desc: string;
    points: number;
    duration: string;
    difficulty: "easy" | "medium" | "hard";
  }> = [
    { name: "transport", value: transportEmissions, code: "ai-transit-shift", title: "Transit Shift Week", desc: "Shift 3 commute trips this week from driving to public transit, cycling, or walking.", points: 150, duration: "7 days", difficulty: "medium" },
    { name: "energy", value: energyEmissions, code: "ai-unplug-standby", title: "Unplug Vampire Loads", desc: "Unplug all screen displays, game consoles, and chargers on standby at night for 5 days.", points: 100, duration: "5 days", difficulty: "easy" },
    { name: "food", value: foodEmissions, code: "ai-plant-based-week", title: "Plant-Based Weekdays", desc: "Commit to eating 100% vegetarian meals from Monday to Friday.", points: 180, duration: "5 days", difficulty: "medium" },
    { name: "shopping", value: shoppingEmissions, code: "ai-no-buy-week", title: "No-New Shopping Week", desc: "Do not buy any clothing, gadgets, or new home accessories for 7 days.", points: 200, duration: "7 days", difficulty: "hard" },
  ];
  categories.sort((a, b) => b.value - a.value);

  return [
    {
      code: categories[0].code,
      title: categories[0].title,
      description: categories[0].desc,
      category: categories[0].name,
      points: categories[0].points,
      duration: categories[0].duration,
      difficulty: categories[0].difficulty,
    },
    {
      code: categories[1].code,
      title: categories[1].title,
      description: categories[1].desc,
      category: categories[1].name,
      points: categories[1].points,
      duration: categories[1].duration,
      difficulty: categories[1].difficulty,
    }
  ];
}
