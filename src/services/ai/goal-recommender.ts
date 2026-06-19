import { CarbonAssessment, AIRecommendation } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

function cleanJson(str: string): string {
  return str.replace(/```json/i, "").replace(/```/g, "").trim();
}

/**
 * Generates personalized goal recommendations.
 * Utilizes Gemini if configured, otherwise falls back to static rule-based prioritizing heuristics.
 * 
 * @param assessment - The user's latest Carbon Assessment data, or null.
 * @returns A promise resolving to the list of generated recommendations.
 */
export async function generateDynamicRecommendations(assessment: CarbonAssessment | null): Promise<AIRecommendation[]> {
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
    wasteEmissions
  } = assessment;

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
You are CarbonWise, a sustainability advisor. Generate 3 custom recommended action goals for the user based on their assessment:
- Transportation: ${transportEmissions} kg (${transportKm} km/day on ${transportType})
- Energy/Electricity: ${energyEmissions} kg (monthly bill: $${electricityBill})
- Diet/Food: ${foodEmissions} kg (${foodHabits})
- Shopping: ${shoppingEmissions} kg (${shoppingHabits})
- Waste/Recycling: ${wasteEmissions} kg (${wasteHabits})

Return ONLY a JSON array containing exactly 3 objects with keys:
- "title": short, active task description (e.g. "Swap beef for poultry")
- "category": "transport", "energy", "food", "shopping", "waste"
- "co2": expected annual reduction in kg CO2 (e.g. 180)
- "diff": "easy", "medium", or "hard"

Do not include markdown code block syntax. Return only raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini dynamic recommendations error", e);
    }
  }

  // --- LOCAL FALLBACK RECOMMENDATIONS ---
  const allRecs: Array<{
    title: string;
    category: "transport" | "energy" | "food" | "shopping" | "waste";
    co2: number;
    diff: "easy" | "medium" | "hard";
    priority: number;
  }> = [
    { title: "Carpool or ride transit 2 days/week", category: "transport", co2: 380, diff: "medium", priority: transportEmissions },
    { title: "Switch home lightbulbs to LEDs", category: "energy", co2: 120, diff: "easy", priority: energyEmissions },
    { title: "Implement Meatless Mondays", category: "food", co2: 150, diff: "easy", priority: foodEmissions },
    { title: "Unplug standby vampire electronics", category: "energy", co2: 80, diff: "easy", priority: energyEmissions * 0.5 },
    { title: "Compost kitchen food scraps", category: "waste", co2: 140, diff: "medium", priority: wasteEmissions },
    { title: "Reduce clothing shopping by 50%", category: "shopping", co2: 600, diff: "hard", priority: shoppingEmissions },
  ];
  allRecs.sort((a, b) => b.priority - a.priority);

  return allRecs.slice(0, 3).map(({ title, category, co2, diff }) => ({ title, category, co2, diff }));
}
