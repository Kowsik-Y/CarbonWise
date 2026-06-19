import { CarbonAssessment, SimulatorOptimization } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

function cleanJson(str: string): string {
  return str.replace(/```json/i, "").replace(/```/g, "").trim();
}

/**
 * Generates an optimized target set of inputs for the sustainability simulator.
 * Utilizes Gemini if configured, otherwise falls back to local reduction scaling heuristics.
 * 
 * @param assessment - The user's latest Carbon Assessment data, or null.
 * @returns A promise resolving to the optimized target metrics or null.
 */
export async function generateSimulatorOptimization(assessment: CarbonAssessment | null): Promise<SimulatorOptimization | null> {
  if (!assessment) return null;

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
You are CarbonWise, a sustainability planner. Suggest the single most optimal simulation setup for a user based on their carbon assessment:
- Transportation: ${transportEmissions} kg (${transportKm} km/day on ${transportType})
- Energy/Electricity: ${energyEmissions} kg (monthly bill: $${electricityBill})
- Diet/Food: ${foodEmissions} kg (${foodHabits})
- Shopping: ${shoppingEmissions} kg (${shoppingHabits})
- Waste/Recycling: ${wasteEmissions} kg (${wasteHabits})

Recommend target values to achieve significant reduction with minimal friction. Return ONLY a JSON object:
{
  "targetTransportKm": number,
  "targetTransportType": string ("car_petrol", "car_diesel", "car_electric", "public_transit", "none"),
  "targetElectricityBill": number,
  "targetFoodHabits": string ("high_meat", "low_meat", "vegetarian", "vegan"),
  "targetShoppingHabits": string ("minimal", "average", "heavy"),
  "targetWasteHabits": string ("recycle_all", "recycle_some", "no_recycling")
}
Do not include markdown code block syntax. Return only raw JSON.
`;
      const result = await model.generateContent(prompt);
      const resText = result.response.text();
      if (resText) {
        return JSON.parse(cleanJson(resText));
      }
    } catch (e) {
      logger.error("Gemini simulator optimization error", e);
    }
  }

  // --- LOCAL FALLBACK SIMULATOR OPTIMIZER ---
  const targetTransportKm = Math.max(0, Math.round(transportKm * 0.6));
  const targetTransportType = transportType === "car_petrol" || transportType === "car_diesel" ? "public_transit" : transportType;
  const targetElectricityBill = Math.max(0, Math.round(electricityBill * 0.7));
  const targetFoodHabits = foodHabits === "high_meat" ? "low_meat" : foodHabits === "low_meat" ? "vegetarian" : "vegan";
  const targetShoppingHabits = shoppingHabits === "heavy" ? "average" : "minimal";
  const targetWasteHabits = wasteHabits === "no_recycling" ? "recycle_some" : "recycle_all";

  return {
    targetTransportKm,
    targetTransportType,
    targetElectricityBill,
    targetFoodHabits,
    targetShoppingHabits,
    targetWasteHabits
  };
}
